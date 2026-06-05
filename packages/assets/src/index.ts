import type {
  AssetIndex,
  AssetRef,
  AssetReference,
  AssetReferenceKind,
  AssetStatus,
} from "@wnote/contracts";

export interface BuildAssetIndexOptions {
  documentPath?: string;
  exists?: (absolutePath: string) => boolean;
  availableAssets?: AssetRef[];
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;

interface AssetReferenceMatch {
  fullStart: number;
  fullEnd: number;
  targetStart: number;
  targetEnd: number;
  target: string;
  wrapped: boolean;
  kind: "markdown" | "html";
}

export function buildAssetIndex(
  markdown: string,
  options: BuildAssetIndexOptions = {},
): AssetIndex {
  const references = extractAssetReferences(markdown, options).map((reference) =>
    withStatus(reference, options.exists),
  );
  const localReferences = references.filter((reference) => reference.kind === "local");
  return {
    documentPath: options.documentPath,
    references,
    missing: localReferences.filter((reference) => reference.status === "missing"),
    unused: findUnusedAssets(options.availableAssets ?? [], localReferences),
  };
}

export function extractAssetReferences(
  markdown: string,
  options: Pick<BuildAssetIndexOptions, "documentPath"> = {},
): AssetReference[] {
  const references: AssetReference[] = [];
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const rawTarget = unwrapMarkdownUrl(match[2] ?? "");
    references.push(createReference(rawTarget, match.index ?? 0, options.documentPath));
  }
  for (const match of markdown.matchAll(HTML_IMAGE_PATTERN)) {
    const rawTarget = match[1] ?? match[2] ?? match[3] ?? "";
    references.push(createReference(rawTarget, match.index ?? 0, options.documentPath));
  }
  return references;
}

export function resolveAssetPreviewSrc(src: string, documentPath?: string): string {
  const kind = classifyAssetTarget(src);
  if (kind !== "local") return src;
  const absolutePath = resolveLocalAssetPath(src, documentPath);
  return absolutePath ? toAssetUrl(absolutePath) : src;
}

export function toAssetUrl(absolutePath: string): string {
  return `wnote-asset://${absolutePath}`;
}

export function toMarkdownAssetPath(absolutePath: string, documentPath?: string): string {
  if (!documentPath) return absolutePath;
  return normalizeMarkdownPath(relativePath(dirnamePath(documentPath), absolutePath));
}

export function deleteAssetReference(
  markdown: string,
  reference: Pick<AssetReference, "position" | "src">,
): string {
  const match = findAssetReferenceMatch(markdown, reference);
  if (!match) return markdown;
  const range = expandDeleteRange(markdown, match.fullStart, match.fullEnd, match.kind);
  return `${markdown.slice(0, range.start)}${markdown.slice(range.end)}`;
}

export function replaceAssetReference(
  markdown: string,
  reference: Pick<AssetReference, "position" | "src">,
  nextSrc: string,
): string {
  const match = findAssetReferenceMatch(markdown, reference);
  if (!match) return markdown;
  const target =
    match.kind === "markdown" && (match.wrapped || shouldWrapMarkdownUrl(nextSrc))
      ? `<${nextSrc}>`
      : nextSrc;
  return `${markdown.slice(0, match.targetStart)}${target}${markdown.slice(match.targetEnd)}`;
}

export function defaultAssetDirectory(documentPath: string): string {
  return joinPath(
    dirnamePath(documentPath),
    `${stripExtension(basenamePath(documentPath))}.assets`,
  );
}

export function findUnusedAssets(assets: AssetRef[], references: AssetReference[]): AssetRef[] {
  const referenced = new Set(
    references
      .filter((reference) => reference.kind === "local" && reference.absolutePath)
      .map((reference) => normalizePath(reference.absolutePath!)),
  );
  return assets.filter((asset) => !referenced.has(normalizePath(asset.absolutePath)));
}

function createReference(src: string, position: number, documentPath?: string): AssetReference {
  const kind = classifyAssetTarget(src);
  const absolutePath = kind === "local" ? resolveLocalAssetPath(src, documentPath) : undefined;
  return {
    src,
    kind,
    position,
    status: "external",
    absolutePath,
    previewSrc: absolutePath ? toAssetUrl(absolutePath) : src,
  };
}

function withStatus(reference: AssetReference, exists?: (absolutePath: string) => boolean) {
  const status: AssetStatus =
    reference.kind === "local" && reference.absolutePath
      ? exists
        ? exists(reference.absolutePath)
          ? "ok"
          : "missing"
        : "unknown"
      : "external";
  return { ...reference, status };
}

function classifyAssetTarget(src: string): AssetReferenceKind {
  const lower = src.toLowerCase();
  if (lower.startsWith("data:")) return "data";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src)) return "remote";
  return "local";
}

function resolveLocalAssetPath(src: string, documentPath?: string): string | undefined {
  const path = decodeUriPath(src);
  if (!path) return undefined;
  if (isAbsolutePath(path)) return normalizePath(path);
  if (!documentPath) return normalizePath(path);
  return normalizePath(joinPath(dirnamePath(documentPath), path));
}

function unwrapMarkdownUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return trimmed.slice(1, -1);
  return trimmed;
}

function decodeUriPath(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function stripExtension(name: string): string {
  const ext = extnamePath(name);
  return ext ? name.slice(0, -ext.length) : name;
}

function normalizeMarkdownPath(path: string): string {
  return path.split("\\").join("/");
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const prefix = normalized.startsWith("/") ? "/" : "";
  const parts = normalized.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === ".." && stack.length && stack[stack.length - 1] !== "..") {
      stack.pop();
      continue;
    }
    if (part === ".." && prefix) continue;
    stack.push(part);
  }
  return `${prefix}${stack.join("/")}` || ".";
}

function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function dirnamePath(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return normalized.startsWith("/") ? "/" : ".";
  return normalized.slice(0, index);
}

function basenamePath(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function extnamePath(path: string): string {
  const base = basenamePath(path);
  const index = base.lastIndexOf(".");
  return index > 0 ? base.slice(index) : "";
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[a-z]:[\\/]/i.test(path);
}

function findAssetReferenceMatch(
  markdown: string,
  reference: Pick<AssetReference, "position" | "src">,
): AssetReferenceMatch | undefined {
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const fullStart = match.index ?? 0;
    if (fullStart !== reference.position) continue;
    const rawTarget = match[2] ?? "";
    const target = unwrapMarkdownUrl(rawTarget);
    if (target !== reference.src) continue;
    const targetOffset = match[0].indexOf(rawTarget);
    return {
      fullStart,
      fullEnd: fullStart + match[0].length,
      targetStart: fullStart + targetOffset,
      targetEnd: fullStart + targetOffset + rawTarget.length,
      target,
      wrapped: rawTarget.startsWith("<") && rawTarget.endsWith(">"),
      kind: "markdown",
    };
  }

  for (const match of markdown.matchAll(HTML_IMAGE_PATTERN)) {
    const fullStart = match.index ?? 0;
    if (fullStart !== reference.position) continue;
    const rawTarget = match[1] ?? match[2] ?? match[3] ?? "";
    if (rawTarget !== reference.src) continue;
    const targetOffset = match[0].indexOf(rawTarget);
    return {
      fullStart,
      fullEnd: fullStart + match[0].length,
      targetStart: fullStart + targetOffset,
      targetEnd: fullStart + targetOffset + rawTarget.length,
      target: rawTarget,
      wrapped: false,
      kind: "html",
    };
  }

  return undefined;
}

function expandDeleteRange(
  markdown: string,
  start: number,
  end: number,
  kind: AssetReferenceMatch["kind"],
): { start: number; end: number } {
  if (kind === "html") {
    const figureRange = enclosingFigureRange(markdown, start, end);
    if (figureRange)
      return expandDeleteRange(markdown, figureRange.start, figureRange.end, "markdown");
  }
  const lineStart = markdown.lastIndexOf("\n", start - 1) + 1;
  const nextLineBreak = markdown.indexOf("\n", end);
  const lineEnd = nextLineBreak === -1 ? markdown.length : nextLineBreak + 1;
  const lineWithoutReference = `${markdown.slice(lineStart, start)}${markdown.slice(end, lineEnd)}`;
  if (lineWithoutReference.trim() === "") return { start: lineStart, end: lineEnd };
  return { start, end };
}

function enclosingFigureRange(
  markdown: string,
  start: number,
  end: number,
): { start: number; end: number } | null {
  const before = markdown.slice(0, start);
  const figureStart = before.lastIndexOf("<figure");
  if (figureStart === -1) return null;
  const previousFigureEnd = before.lastIndexOf("</figure>");
  if (previousFigureEnd > figureStart) return null;
  const figureEnd = markdown.indexOf("</figure>", end);
  if (figureEnd === -1) return null;
  return { start: figureStart, end: figureEnd + "</figure>".length };
}

function shouldWrapMarkdownUrl(src: string): boolean {
  return /\s|[()]/.test(src);
}

function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...fromParts.map(() => ".."), ...toParts].join("/") || ".";
}
