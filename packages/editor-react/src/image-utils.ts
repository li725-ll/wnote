export type ImageAlign = "left" | "center" | "right";

export interface ImageRenderAttrs {
  src: string;
  alt?: string | null;
  title?: string | null;
  width?: string | null;
  align?: ImageAlign | null;
  caption?: string | null;
}

export function normalizeImageAlign(value: unknown): ImageAlign | null {
  if (value === "left" || value === "center" || value === "right") return value;
  return null;
}

export function normalizeImageWidth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(?:\.\d+)?(?:px|%)$/.test(trimmed)) return trimmed;
  return null;
}

export function imageFigureAttrs(attrs: ImageRenderAttrs): Record<string, string> | null {
  const align = normalizeImageAlign(attrs.align);
  const caption = normalizeNullableText(attrs.caption);
  if (!align && !caption) return null;
  return {
    "data-wnote-image": "true",
    ...(align ? { "data-align": align } : {}),
  };
}

export function imageStyle(width: string | null): { width: string } | undefined {
  return width ? { width } : undefined;
}

export function imageWidthLabel(width: string | null, dragWidth?: string | null): string {
  return dragWidth || width || "Auto";
}

export function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function clampImageWidth(value: number, maxWidth: number): number {
  return Math.round(Math.min(Math.max(maxWidth, 80), Math.max(80, value)));
}

export function imageDisplaySource(
  src: string,
  previewSrc: string | null | undefined,
  resolveAsset?: (src: string) => string | null,
): string | null {
  if (previewSrc != null) return previewSrc || null;
  if (resolveAsset) return resolveAsset(src);
  return src;
}

export function imageAssetResolverFromExtension(
  extension: { options?: { assetResolver?: unknown } } | null | undefined,
): ((src: string) => string | null) | undefined {
  const resolver = extension?.options?.assetResolver;
  return typeof resolver === "function" ? (resolver as (src: string) => string | null) : undefined;
}
