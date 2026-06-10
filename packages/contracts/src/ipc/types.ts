import type { IpcChannel } from "./channels";

export interface ElectronAPI {
  platform: string;
  send: (channel: IpcChannel, ...args: unknown[]) => void;
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => void;
  off: (channel: IpcChannel, listener: (...args: unknown[]) => void) => void;
}

export interface FileStatDTO {
  mtimeMs: number;
  size: number;
}

export interface OpenDocumentResult {
  filePath: string;
  name: string;
  content: string;
  stat?: FileStatDTO;
  assets?: AssetIndex;
}

export interface SaveDocumentRequest {
  filePath?: string;
  content: string;
  defaultName?: string;
}

export interface SaveDocumentResult {
  filePath: string;
  name: string;
  stat?: FileStatDTO;
  assets?: AssetIndex;
}

export interface WorkspaceTreeNode {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: WorkspaceTreeNode[];
}

export interface WorkspaceOpenResult {
  rootPath: string;
  name: string;
  tree: WorkspaceTreeNode[];
}

export interface WorkspaceReadRequest {
  rootPath?: string;
}

export interface WorkspaceCreateFileRequest {
  rootPath: string;
  parentPath?: string;
  name: string;
  content?: string;
}

export interface WorkspaceCreateDirectoryRequest {
  rootPath: string;
  parentPath?: string;
  name: string;
}

export interface WorkspaceCreateFileResult {
  workspace: WorkspaceOpenResult;
  document: OpenDocumentResult;
}

export interface WorkspaceRenameRequest {
  rootPath: string;
  targetPath: string;
  name: string;
}

export interface WorkspaceRenameResult {
  workspace: WorkspaceOpenResult;
  oldPath: string;
  newPath: string;
  nodeType: WorkspaceTreeNode["type"];
}

export interface WorkspaceMoveRequest {
  rootPath: string;
  sourcePath: string;
  targetDirectoryPath?: string;
}

export interface WorkspaceMoveResult {
  workspace: WorkspaceOpenResult;
  oldPath: string;
  newPath: string;
  nodeType: WorkspaceTreeNode["type"];
}

export interface WorkspaceDeleteRequest {
  rootPath: string;
  targetPath: string;
  recursive?: boolean;
}

export interface WorkspaceDeleteResult {
  workspace: WorkspaceOpenResult;
  deletedPath: string;
  nodeType: WorkspaceTreeNode["type"];
}

export interface ExportHtmlRequest {
  content: string;
  documentPath?: string;
  defaultName?: string;
  options?: ExportHtmlOptions;
}

export interface ExportHtmlResult {
  filePath: string;
}

export interface ExportPdfRequest {
  content: string;
  documentPath?: string;
  defaultName?: string;
  options?: ExportHtmlOptions;
}

export interface ExportPdfResult {
  filePath: string;
}

export interface ExportPreviewRequest {
  content: string;
  documentPath?: string;
  defaultName?: string;
  format: "html" | "pdf";
  options?: ExportHtmlOptions;
}

export interface ExportPreviewResult {
  ok: boolean;
}

export interface ExportHtmlOptions {
  inlineLocalImages?: boolean;
  renderMermaid?: boolean;
  theme?: "light" | "dark";
  pdf?: ExportPdfOptions;
}

export interface ExportPdfOptions {
  pageSize?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  margin?: "default" | "compact" | "wide";
  printBackground?: boolean;
}

export interface ShellPathRequest {
  filePath: string;
}

export interface ShellOpenPathResult {
  ok: boolean;
  error?: string;
}

export interface SaveAssetRequest {
  buffer: ArrayBuffer;
  ext: string;
  documentPath?: string;
  originalName?: string;
  mime?: string;
}

export interface ImportAssetRequest {
  documentPath?: string;
}

export interface DeleteAssetRequest {
  documentPath: string;
  absolutePath: string;
  content: string;
}

export interface DeleteAssetResult {
  assets: AssetIndex;
}

export interface DeleteManyAssetsRequest {
  documentPath: string;
  absolutePaths: string[];
  content: string;
}

export interface DeleteManyAssetsResult {
  assets: AssetIndex;
  deleted: string[];
  failed: Array<{
    absolutePath: string;
    reason: string;
  }>;
}

export interface AssetRef {
  id: string;
  absolutePath: string;
  markdownPath: string;
  url: string;
  originalName?: string;
  ext: string;
  mime?: string;
  size: number;
  createdAt: number;
}

export type AssetReferenceKind = "local" | "remote" | "data";

export type AssetStatus = "ok" | "missing" | "external" | "unknown";

export interface AssetReference {
  src: string;
  kind: AssetReferenceKind;
  position: number;
  status: AssetStatus;
  absolutePath?: string;
  previewSrc?: string;
}

export interface AssetIndex {
  documentPath?: string;
  references: AssetReference[];
  missing: AssetReference[];
  unused: AssetRef[];
}
