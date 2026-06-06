import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from "fs/promises";
import { basename, extname, join, relative, resolve } from "path";
import {
  buildAssetIndex,
  defaultAssetDirectory,
  toAssetUrl,
  toMarkdownAssetPath,
} from "@wnote/assets";
import type {
  AssetRef,
  FileStatDTO,
  OpenDocumentResult,
  SaveAssetRequest,
  SaveDocumentRequest,
  SaveDocumentResult,
  WorkspaceOpenResult,
  WorkspaceTreeNode,
} from "@wnote/contracts";
export {
  exportHtmlDocument,
  renderHtmlDocument,
  renderExportHtml,
  rewriteLocalImageSources,
  wrapHtmlDocument,
} from "./export-html";

export const SUPPORTED_DOCUMENT_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const IGNORED_WORKSPACE_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".vite",
]);
const MAX_WORKSPACE_DEPTH = 8;

export function isSupportedDocumentPath(filePath: string): boolean {
  return SUPPORTED_DOCUMENT_EXTENSIONS.has(extname(filePath).toLowerCase()) && existsSync(filePath);
}

export function extractDocumentPathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith("-")) continue;
    if (isSupportedDocumentPath(arg)) return arg;
  }
  return null;
}

export async function openDocument(filePath: string): Promise<OpenDocumentResult> {
  const content = await readFile(filePath, "utf-8");
  return {
    filePath,
    name: basename(filePath),
    content,
    stat: await getFileStat(filePath),
    assets: await buildDocumentAssetIndex(content, filePath),
  };
}

export async function readWorkspace(rootPath: string): Promise<WorkspaceOpenResult> {
  const rootStat = await stat(rootPath);
  if (!rootStat.isDirectory()) throw new Error("Workspace path is not a directory");
  return {
    rootPath,
    name: basename(rootPath),
    tree: await scanWorkspaceDirectory(rootPath, 0),
  };
}

export async function saveDocument(
  payload: SaveDocumentRequest & { filePath: string },
): Promise<SaveDocumentResult> {
  await writeFile(payload.filePath, payload.content, "utf-8");
  return {
    filePath: payload.filePath,
    name: basename(payload.filePath),
    stat: await getFileStat(payload.filePath),
    assets: await buildDocumentAssetIndex(payload.content, payload.filePath),
  };
}

export async function saveAsset(
  payload: SaveAssetRequest,
  options: { dataDirectory: string },
): Promise<AssetRef> {
  const id = randomUUID();
  const ext = payload.ext.replace(/^\./, "") || "png";
  const targetDir = payload.documentPath
    ? defaultAssetDirectory(payload.documentPath)
    : join(options.dataDirectory, "images");
  await mkdir(targetDir, { recursive: true });

  const fileName = `${id}.${ext}`;
  const absolutePath = join(targetDir, fileName);
  const buffer = Buffer.from(payload.buffer);
  await writeFile(absolutePath, buffer);

  const markdownPath = toMarkdownAssetPath(absolutePath, payload.documentPath);

  return {
    id,
    absolutePath,
    markdownPath,
    url: toAssetUrl(absolutePath),
    originalName: payload.originalName,
    ext,
    mime: payload.mime,
    size: buffer.byteLength,
    createdAt: Date.now(),
  };
}

export async function importAsset(payload: {
  sourcePath: string;
  documentPath: string;
}): Promise<AssetRef> {
  const id = randomUUID();
  const ext = extname(payload.sourcePath).replace(/^\./, "") || "bin";
  const targetDir = defaultAssetDirectory(payload.documentPath);
  await mkdir(targetDir, { recursive: true });

  const fileName = `${id}.${ext}`;
  const absolutePath = join(targetDir, fileName);
  await copyFile(payload.sourcePath, absolutePath);
  const s = await stat(absolutePath);

  return {
    id,
    absolutePath,
    markdownPath: toMarkdownAssetPath(absolutePath, payload.documentPath),
    url: toAssetUrl(absolutePath),
    originalName: basename(payload.sourcePath),
    ext,
    mime: mimeFromExtension(ext),
    size: s.size,
    createdAt: Date.now(),
  };
}

export async function deleteAsset(payload: {
  documentPath: string;
  absolutePath: string;
  content: string;
}) {
  await deleteAssetFile(payload.absolutePath, payload.documentPath);
  return buildDocumentAssetIndex(payload.content, payload.documentPath);
}

export async function deleteAssets(payload: {
  documentPath: string;
  absolutePaths: string[];
  content: string;
}) {
  const deleted: string[] = [];
  const failed: Array<{ absolutePath: string; reason: string }> = [];
  for (const absolutePath of payload.absolutePaths) {
    try {
      await deleteAssetFile(absolutePath, payload.documentPath);
      deleted.push(absolutePath);
    } catch (error) {
      failed.push({
        absolutePath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    assets: await buildDocumentAssetIndex(payload.content, payload.documentPath),
    deleted,
    failed,
  };
}

async function getFileStat(filePath: string): Promise<FileStatDTO> {
  const s = await stat(filePath);
  return { mtimeMs: s.mtimeMs, size: s.size };
}

async function buildDocumentAssetIndex(content: string, documentPath: string) {
  return buildAssetIndex(content, {
    documentPath,
    exists: existsSync,
    availableAssets: await scanDocumentAssets(documentPath),
  });
}

async function scanDocumentAssets(documentPath: string): Promise<AssetRef[]> {
  const directory = defaultAssetDirectory(documentPath);
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const assets: AssetRef[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolutePath = join(directory, entry.name);
    const s = await stat(absolutePath);
    const ext = extname(entry.name).replace(/^\./, "");
    assets.push({
      id: absolutePath,
      absolutePath,
      markdownPath: toMarkdownAssetPath(absolutePath, documentPath),
      url: toAssetUrl(absolutePath),
      originalName: entry.name,
      ext,
      mime: mimeFromExtension(ext),
      size: s.size,
      createdAt: s.birthtimeMs,
    });
  }
  return assets;
}

async function scanWorkspaceDirectory(
  directory: string,
  depth: number,
): Promise<WorkspaceTreeNode[]> {
  if (depth > MAX_WORKSPACE_DEPTH) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const nodes: WorkspaceTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_WORKSPACE_DIRECTORIES.has(entry.name)) continue;
      const children = await scanWorkspaceDirectory(fullPath, depth + 1);
      if (children.length === 0) continue;
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: "directory",
        children,
      });
      continue;
    }

    if (!entry.isFile() || !SUPPORTED_DOCUMENT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      continue;
    }
    nodes.push({
      name: entry.name,
      path: fullPath,
      type: "file",
    });
  }

  return nodes.sort(compareWorkspaceNodes);
}

function compareWorkspaceNodes(left: WorkspaceTreeNode, right: WorkspaceTreeNode): number {
  if (left.type !== right.type) return left.type === "directory" ? -1 : 1;
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
}

function mimeFromExtension(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case "apng":
      return "image/apng";
    case "avif":
      return "image/avif";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      return undefined;
  }
}

function assertAssetWithinDocumentDirectory(assetPath: string, documentPath: string): void {
  const assetDirectory = resolve(defaultAssetDirectory(documentPath));
  const target = resolve(assetPath);
  const rel = relative(assetDirectory, target);
  if (rel === "" || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\")) {
    throw new Error("Asset path is outside the document assets directory");
  }
}

async function deleteAssetFile(absolutePath: string, documentPath: string): Promise<void> {
  assertAssetWithinDocumentDirectory(absolutePath, documentPath);
  const s = await stat(absolutePath);
  if (!s.isFile()) throw new Error("Asset is not a file");
  await unlink(absolutePath);
}
