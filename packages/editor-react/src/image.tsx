import ImageExtension from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { AssetResolver, ImagePathActionHandler, ImageSaveHandler } from "./index";
import {
  clampImageWidth,
  imageAssetResolverFromExtension,
  imageDisplaySource,
  imageFigureAttrs,
  imageStyle,
  imageWidthLabel,
  normalizeImageAlign,
  normalizeImageWidth,
} from "./image-utils";
import { withNodeViewErrorBoundary } from "./NodeViewErrorBoundary";
import styles from "./Image.module.css";

declare module "@tiptap/extension-image" {
  interface ImageOptions {
    assetResolver?: AssetResolver;
    onImageSave?: ImageSaveHandler;
    onImageReveal?: ImagePathActionHandler;
    onImagePathCopy?: ImagePathActionHandler;
  }
}

export const Image = ImageExtension.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      assetResolver: undefined as AssetResolver | undefined,
      onImageSave: undefined as ImageSaveHandler | undefined,
      onImageReveal: undefined as ImagePathActionHandler | undefined,
      onImagePathCopy: undefined as ImagePathActionHandler | undefined,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const image = imageElement(element);
          return normalizeImageWidth(
            image?.getAttribute("data-width") ?? image?.getAttribute("width"),
          );
        },
        renderHTML: (attributes) => {
          const width = normalizeImageWidth(attributes.width);
          return width ? { "data-width": width, style: `width: ${width};` } : {};
        },
      },
      previewSrc: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      align: {
        default: null,
        parseHTML: (element) => imageAlign(element),
        renderHTML: () => ({}),
      },
      caption: {
        default: null,
        parseHTML: (element) => figureCaption(element),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-wnote-image]",
        getAttrs: (element) => {
          const img = imageElement(element);
          if (!img?.getAttribute("src")) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("data-width") ?? img.getAttribute("width"),
            align: imageAlign(element),
            caption: figureCaption(element),
          };
        },
      },
      {
        tag: this.options.allowBase64 ? "img[src]" : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const imageAttributes = imageHtmlAttrs(HTMLAttributes);
    const { align, caption } = HTMLAttributes;
    const figureAttributes = imageFigureAttrs({
      src: String(imageAttributes.src ?? ""),
      align,
      caption,
    });
    if (!figureAttributes) return ["img", mergeAttributes(imageAttributes)];

    return [
      "figure",
      figureAttributes,
      ["img", mergeAttributes(imageAttributes)],
      ...(caption ? [["figcaption", {}, caption]] : []),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withNodeViewErrorBoundary(ImageView), {
      as: "figure",
    });
  },
});

export function selectedImageInfo(editor: {
  state: {
    selection: { from: number };
    doc: {
      nodeAt(
        pos: number,
      ): { type: { name: string }; attrs: Record<string, unknown>; nodeSize: number } | null;
    };
  };
  view: { nodeDOM(pos: number): Node | null };
}): { pos: number; nodeSize: number; attrs: Record<string, unknown>; element: HTMLElement } | null {
  const pos = editor.state.selection.from;
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name !== "image") return null;
  const dom = editor.view.nodeDOM(pos);
  const element =
    dom instanceof HTMLElement
      ? dom.matches("[data-wnote-image-view]")
        ? dom
        : dom.querySelector<HTMLElement>("[data-wnote-image-view]")
      : null;
  if (!element) return null;
  return { pos, nodeSize: node.nodeSize, attrs: node.attrs, element };
}

function imageHtmlAttrs(attributes: Record<string, unknown>) {
  const result = { ...attributes };
  delete result.align;
  delete result.caption;
  delete result.previewSrc;
  return result;
}

function ImageView({ node, selected, updateAttributes, extension }: NodeViewProps) {
  const [loaded, setLoaded] = useState(true);
  const [resolvedSrc, setResolvedSrc] = useState<string | null | undefined>(undefined);
  const [dragWidth, setDragWidth] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const src = String(node.attrs.src ?? "");
  const previewSrc =
    typeof node.attrs.previewSrc === "string" && node.attrs.previewSrc
      ? node.attrs.previewSrc
      : null;
  const alt = String(node.attrs.alt ?? "");
  const title = String(node.attrs.title ?? "");
  const width = normalizeImageWidth(node.attrs.width);
  const align = normalizeImageAlign(node.attrs.align);
  const caption = String(node.attrs.caption ?? "");
  const assetResolver = imageAssetResolverFromExtension(extension);
  const displaySrc =
    resolvedSrc !== undefined ? resolvedSrc : imageDisplaySource(src, previewSrc, assetResolver);

  useEffect(() => {
    setResolvedSrc(undefined);
    setLoaded(true);
  }, [src, previewSrc, assetResolver]);

  return (
    <NodeViewWrapper
      className={styles.wrapper}
      data-wnote-image-view="true"
      data-align={align || undefined}
      data-selected={selected ? "true" : "false"}
    >
      <div
        ref={figureRef}
        className={styles.figure}
        contentEditable={false}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button,input")) event.stopPropagation();
        }}
      >
        <div className={styles.imageWrap}>
          {loaded && displaySrc ? (
            <img
              ref={imageRef}
              className={styles.image}
              src={displaySrc}
              alt={alt}
              title={title || undefined}
              style={dragWidth ? { width: dragWidth } : imageStyle(width)}
              onError={() => {
                const nextSrc = assetResolver?.(src);
                if (nextSrc && nextSrc !== displaySrc) {
                  setResolvedSrc(nextSrc);
                  setLoaded(true);
                  return;
                }
                setLoaded(false);
              }}
            />
          ) : (
            <div className={styles.error} style={imageStyle(width)}>
              <span>图片无法加载</span>
              <code>{src}</code>
            </div>
          )}
          {selected && loaded && displaySrc ? (
            <button
              className={styles.resizeHandle}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const image = imageRef.current;
                if (!image) return;
                const startX = event.clientX;
                const startWidth = image.getBoundingClientRect().width;
                const maxWidth =
                  figureRef.current?.parentElement?.getBoundingClientRect().width ?? startWidth;
                const target = event.currentTarget;
                target.setPointerCapture(event.pointerId);

                const onMove = (moveEvent: PointerEvent) => {
                  const nextWidth = clampImageWidth(
                    startWidth + moveEvent.clientX - startX,
                    maxWidth,
                  );
                  setDragWidth(`${nextWidth}px`);
                };
                const onUp = (upEvent: PointerEvent) => {
                  try {
                    target.releasePointerCapture(upEvent.pointerId);
                  } catch {
                    // Pointer may already be released if the drag ends outside the handle.
                  }
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                  const nextWidth = imageRef.current?.getBoundingClientRect().width ?? startWidth;
                  const value = `${clampImageWidth(nextWidth, maxWidth)}px`;
                  setDragWidth(null);
                  updateAttributes({ width: value });
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            />
          ) : null}
        </div>
        {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
        {selected ? (
          <span className={styles.widthBadge}>{imageWidthLabel(width, dragWidth)}</span>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

function imageElement(element: HTMLElement): HTMLImageElement | null {
  if (element instanceof HTMLImageElement) return element;
  return element.querySelector("img");
}

function figureCaption(element: HTMLElement): string | null {
  if (element instanceof HTMLImageElement) return null;
  return element.querySelector("figcaption")?.textContent?.trim() || null;
}

function imageAlign(element: HTMLElement): string | null {
  const value =
    element.getAttribute("data-align") ??
    element.getAttribute("align") ??
    styleTextAlign(element.getAttribute("style") ?? "");
  return normalizeImageAlign(value);
}

function styleTextAlign(style: string): string | null {
  return /(?:^|;)\s*text-align\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim() ?? null;
}
