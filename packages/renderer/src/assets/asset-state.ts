import {
  buildAssetIndex,
  deleteAssetReference,
  replaceAssetReference,
  resolveAssetPreviewSrc,
} from "@wnote/assets";
import type { AssetIndex, AssetReference } from "@wnote/contracts";

export function buildDocumentAssetIndex(
  content: string,
  documentPath: string | null | undefined,
): AssetIndex {
  return buildAssetIndex(content, { documentPath: documentPath ?? undefined });
}

export function resolveDocumentAssetPreview(
  src: string,
  assets: AssetIndex | undefined,
  documentPath: string | null | undefined,
): string | null {
  const reference = assets?.references.find((item) => item.src === src);
  if (reference?.status === "missing") return null;
  return resolveAssetPreviewSrc(src, documentPath ?? undefined);
}

export function resolveDocumentAssetPath(src: string, assets: AssetIndex | undefined): string {
  const reference = assets?.references.find((item) => item.src === src);
  if (reference?.absolutePath) return reference.absolutePath;
  const unused = assets?.unused.find((item) => item.markdownPath === src);
  return unused?.absolutePath ?? src;
}

export function removeDocumentAssetReference(
  content: string,
  reference: AssetReference,
): string | null {
  const next = deleteAssetReference(content, reference);
  return next === content ? null : next;
}

export function relocateDocumentAssetReference(
  content: string,
  reference: AssetReference,
  nextSrc: string,
): string | null {
  const next = replaceAssetReference(content, reference, nextSrc);
  return next === content ? null : next;
}

export function canRelocateDocumentAsset(documentPath: string | null): boolean {
  return Boolean(documentPath);
}

export function getAssetRelocateBlockedMessage(): string {
  return "请先保存当前文档，再重新定位图片。";
}

export function getUnusedAssetDeleteConfirmMessage(markdownPath: string): string {
  return `删除未引用资源？\n${markdownPath}`;
}

export function getUnusedAssetDeleteAllConfirmMessage(count: number): string {
  return `清理 ${count} 个未引用资源？此操作会删除文件。`;
}

export function getUnusedAssetDeleteFailureMessage(deleted: number, failed: number): string {
  return `已删除 ${deleted} 个资源，${failed} 个删除失败。`;
}
