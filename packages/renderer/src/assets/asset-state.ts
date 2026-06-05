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
