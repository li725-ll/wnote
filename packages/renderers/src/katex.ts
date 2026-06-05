import katex from "katex";

export function renderBlockMath(source: string): string {
  try {
    return katex.renderToString(source, { displayMode: true, throwOnError: false });
  } catch {
    return `<pre class="katex-error">${escapeHtml(source)}</pre>`;
  }
}

export function renderInlineMath(source: string): string {
  try {
    return katex.renderToString(source, { displayMode: false, throwOnError: false });
  } catch {
    return `<code>${escapeHtml(source)}</code>`;
  }
}

export function processKatexInHtml(html: string): string {
  html = html.replace(/\$\$([^$]+)\$\$/g, (_, expr) => renderBlockMath(expr));
  return html.replace(/(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g, (_, expr) => renderInlineMath(expr));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
