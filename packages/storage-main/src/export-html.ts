import { readFile, writeFile } from "fs/promises";
import { basename, dirname, extname, relative, resolve } from "path";
import type { ExportHtmlOptions, ExportHtmlRequest, ExportHtmlResult } from "@wnote/contracts";
import { markdownToHtml } from "@wnote/markdown";

const HIGHLIGHT_LANGUAGE_ALIASES = new Map<string, string>([
  ["bash", "sh"],
  ["shell", "sh"],
  ["zsh", "sh"],
  ["md", "markdown"],
  ["markdown", "markdown"],
  ["js", "javascript"],
  ["javascript", "javascript"],
  ["jsx", "jsx"],
  ["ts", "typescript"],
  ["typescript", "typescript"],
  ["tsx", "tsx"],
  ["json", "json"],
  ["css", "css"],
  ["html", "html"],
  ["xml", "xml"],
]);

interface ExportRenderers {
  katex?: {
    renderBlockMath(source: string): string;
    renderInlineMath(source: string): string;
  };
  highlight?: (code: string, language: string, theme: "light" | "dark") => Promise<string>;
}

type RenderExportHtmlOptions = ExportHtmlOptions & {
  documentPath?: string;
  exportPath: string;
  renderers?: ExportRenderers;
};

export async function exportHtmlDocument(
  payload: ExportHtmlRequest & { filePath: string },
  options: ExportHtmlOptions = {},
): Promise<ExportHtmlResult> {
  const html = await renderHtmlDocument(payload, options);
  await writeFile(payload.filePath, html, "utf-8");
  return { filePath: payload.filePath };
}

export async function renderHtmlDocument(
  payload: ExportHtmlRequest & { filePath: string },
  options: ExportHtmlOptions = {},
): Promise<string> {
  const resolvedOptions = { ...payload.options, ...options };
  const body = await renderExportHtml(markdownToHtml(payload.content), {
    documentPath: payload.documentPath,
    exportPath: payload.filePath,
    inlineLocalImages: resolvedOptions.inlineLocalImages ?? false,
    renderMermaid: resolvedOptions.renderMermaid ?? true,
    theme: resolvedOptions.theme ?? "light",
  });
  const title = exportTitle(payload);
  return wrapHtmlDocument(body, title, resolvedOptions);
}

export async function renderExportHtml(
  html: string,
  options: RenderExportHtmlOptions,
): Promise<string> {
  let next = await renderMathPlaceholders(html, options.renderers?.katex);
  next = await renderCodeBlocks(next, options.theme ?? "light", options.renderers);
  next = renderMermaidBlocks(next, options.renderMermaid ?? true);
  next = await rewriteLocalImageSources(next, options);
  return next;
}

export function wrapHtmlDocument(
  body: string,
  title = "WNote Export",
  options: Pick<ExportHtmlOptions, "renderMermaid" | "theme" | "pdf"> = {},
): string {
  const theme = options.theme ?? "light";
  const palette = theme === "dark" ? darkExportPalette : lightExportPalette;
  const pdf = options.pdf ?? {};
  const pageSize = pdf.pageSize ?? "A4";
  const orientation = pdf.orientation ?? "portrait";
  const pageMargin = pdf.margin === "compact" ? "12mm" : pdf.margin === "wide" ? "28mm" : "18mm";
  const mermaidScript =
    options.renderMermaid === false
      ? ""
      : `
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, securityLevel: "strict", theme: "${theme === "dark" ? "dark" : "default"}" });
  </script>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: ${theme}; }
    @page { size: ${pageSize} ${orientation}; margin: ${pageMargin}; }
    body {
      max-width: 860px;
      margin: 48px auto;
      padding: 0 28px;
      color: ${palette.text};
      background: ${palette.background};
      font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin: 1.3em 0 0.55em; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.55rem; border-bottom: 1px solid ${palette.border}; padding-bottom: 0.25em; }
    a { color: ${palette.link}; }
    blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid ${palette.border}; color: ${palette.muted}; }
    pre { overflow-x: auto; padding: 1em; border-radius: 6px; background: ${palette.codeBackground}; }
    code { padding: 0.12em 0.28em; border-radius: 4px; background: ${palette.codeBackground}; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre code { padding: 0; background: transparent; }
    .shiki { overflow-x: auto; padding: 1em; border-radius: 6px; }
    .shiki code { display: block; padding: 0; background: transparent; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid ${palette.border}; padding: 0.45em 0.7em; vertical-align: top; }
    th { background: ${palette.codeBackground}; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    figure { margin: 1.2em 0; }
    figure[data-align="center"] { text-align: center; }
    figure[data-align="right"] { text-align: right; }
    figcaption { margin-top: 0.45em; color: ${palette.muted}; font-size: 0.9em; text-align: center; }
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
    .katex-error { color: #cf222e; }
    .mermaid { margin: 1.25em 0; text-align: center; }
    @media print {
      body { max-width: none; margin: 0; padding: 0; }
      a { color: inherit; }
      pre, blockquote, table, figure, img, .shiki, .katex-display, .mermaid { break-inside: avoid; }
      h1, h2, h3, h4, h5, h6 { break-after: avoid; }
      table { page-break-inside: auto; }
      tr { break-inside: avoid; break-after: auto; }
    }
  </style>
</head>
<body>
${body}${mermaidScript}
</body>
</html>
`;
}

const lightExportPalette = {
  background: "#ffffff",
  text: "#24292f",
  muted: "#57606a",
  border: "#d0d7de",
  codeBackground: "#f6f8fa",
  link: "#0969da",
};

const darkExportPalette = {
  background: "#0d1117",
  text: "#e6edf3",
  muted: "#8b949e",
  border: "#30363d",
  codeBackground: "#161b22",
  link: "#58a6ff",
};

export async function rewriteLocalImageSources(
  html: string,
  options: { documentPath?: string; exportPath: string; inlineLocalImages?: boolean },
): Promise<string> {
  const replacements = await Promise.all(
    [...html.matchAll(/<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi)].map(async (match) => {
      const [, before, quote, src, after] = match;
      const next = await exportImageSrc(src, options);
      if (next === src) return { from: match[0], to: match[0] };
      return {
        from: match[0],
        to: `<img${before}src=${quote}${escapeAttribute(next)}${quote}${after}>`,
      };
    }),
  );

  return replacements.reduce((current, replacement) => {
    return current.replace(replacement.from, replacement.to);
  }, html);
}

async function renderMathPlaceholders(
  html: string,
  injectedKatex?: NonNullable<ExportRenderers["katex"]>,
): Promise<string> {
  const katex = injectedKatex ?? (await import("@wnote/renderers/katex"));
  const blockMatches = [
    ...html.matchAll(/<div\b([^>]*?)\bdata-math-block=(["'])(.*?)\2([^>]*)>[\s\S]*?<\/div>/gi),
  ];
  let next = blockMatches.reduce((current, match) => {
    const source = decodeEntities(match[3]).trim();
    return current.replace(
      match[0],
      renderMathFallback(source, "block", () => katex.renderBlockMath(source)),
    );
  }, html);
  const inlineMatches = [
    ...next.matchAll(/<span\b([^>]*?)\bdata-math-inline=(["'])(.*?)\2([^>]*)>[\s\S]*?<\/span>/gi),
  ];
  next = inlineMatches.reduce((current, match) => {
    const source = decodeEntities(match[3]).trim();
    return current.replace(
      match[0],
      renderMathFallback(source, "inline", () => katex.renderInlineMath(source)),
    );
  }, next);
  return next;
}

async function renderCodeBlocks(
  html: string,
  theme: "light" | "dark",
  renderers?: ExportRenderers,
): Promise<string> {
  const matches = [
    ...html.matchAll(/<pre><code(?: class=(["'])language-([^"']+)\1)?>([\s\S]*?)<\/code><\/pre>/gi),
  ];
  const highlight =
    renderers && "highlight" in renderers
      ? renderers.highlight
      : await loadHighlightIfNeeded(matches);
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const lang = normalizedHighlightLanguage(match[2]);
      const code = decodeEntities(match[3] ?? "");
      if (!lang) {
        return {
          from: match[0],
          to: `<pre><code>${escapeHtml(code.replace(/\n$/g, ""))}</code></pre>`,
        };
      }
      return {
        from: match[0],
        to: await renderCodeFallback(code.replace(/\n$/g, ""), lang, theme, highlight),
      };
    }),
  );
  return replacements.reduce(
    (current, replacement) => current.replace(replacement.from, replacement.to),
    html,
  );
}

async function loadHighlightIfNeeded(
  matches: RegExpMatchArray[],
): Promise<ExportRenderers["highlight"]> {
  if (!matches.some((match) => normalizedHighlightLanguage(match[2]))) return undefined;
  try {
    const { highlight } = await import("@wnote/renderers/shiki");
    return highlight;
  } catch {
    return undefined;
  }
}

function renderMathFallback(
  source: string,
  mode: "block" | "inline",
  render: () => string,
): string {
  try {
    return render();
  } catch {
    const escaped = escapeHtml(source);
    if (mode === "inline") return `<code class="katex-error">${escaped}</code>`;
    return `<pre class="katex-error"><code>${escaped}</code></pre>`;
  }
}

async function renderCodeFallback(
  code: string,
  language: string,
  theme: "light" | "dark",
  highlight?: NonNullable<ExportRenderers["highlight"]>,
): Promise<string> {
  if (!highlight) return plainCodeBlock(code, language);
  try {
    return await highlight(code, language, theme);
  } catch {
    return plainCodeBlock(code, language);
  }
}

function plainCodeBlock(code: string, language?: string): string {
  const className = language ? ` class="language-${escapeAttribute(language)}"` : "";
  return `<pre><code${className}>${escapeHtml(code)}</code></pre>`;
}

function normalizedHighlightLanguage(language: string | undefined): string | null {
  if (!language) return null;
  return HIGHLIGHT_LANGUAGE_ALIASES.get(language.toLowerCase()) ?? null;
}

function renderMermaidBlocks(html: string, enabled: boolean): string {
  return html.replace(
    /<div\b([^>]*?)\bdata-mermaid-block=(["'])(.*?)\2([^>]*)>[\s\S]*?<\/div>/gi,
    (_match, _before, _quote, source) => {
      const diagram = decodeEntities(source).trim();
      if (!enabled)
        return `<pre><code class="language-mermaid">${escapeHtml(diagram)}</code></pre>`;
      return `<div class="mermaid">${escapeHtml(diagram)}</div>`;
    },
  );
}

async function exportImageSrc(
  src: string,
  options: { documentPath?: string; exportPath: string; inlineLocalImages?: boolean },
): Promise<string> {
  if (!options.documentPath) return src;
  if (/^(?:https?:|data:|file:|wnote-asset:)/i.test(src)) return src;
  const absolute = resolve(dirname(options.documentPath), src);
  if (options.inlineLocalImages) {
    const dataUrl = await localImageDataUrl(absolute);
    if (dataUrl) return dataUrl;
  }
  const relativePath = relative(dirname(options.exportPath), absolute).replace(/\\/g, "/");
  return relativePath || basename(absolute);
}

async function localImageDataUrl(filePath: string): Promise<string | null> {
  const mime = imageMimeFromExtension(extname(filePath));
  if (!mime) return null;
  try {
    const data = await readFile(filePath);
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

function imageMimeFromExtension(ext: string): string | null {
  switch (ext.toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}

function exportTitle(payload: ExportHtmlRequest & { filePath: string }): string {
  const source = payload.defaultName ?? payload.documentPath ?? payload.filePath;
  return basename(source, extname(source));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
