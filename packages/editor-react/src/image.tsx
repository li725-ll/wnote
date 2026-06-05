import ImageExtension from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useRef, useState } from "react";
import type { AssetResolver } from "./index";
import {
  clampImageWidth,
  imageDisplaySource,
  imageFigureAttrs,
  imageStyle,
  normalizeImageAlign,
  normalizeImageWidth,
  normalizeNullableText,
} from "./image-utils";
import styles from "./Image.module.css";

declare module "@tiptap/extension-image" {
  interface ImageOptions {
    assetResolver?: AssetResolver;
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
    return ReactNodeViewRenderer(ImageView, {
      as: "figure",
    });
  },
});

function imageHtmlAttrs(attributes: Record<string, unknown>) {
  const result = { ...attributes };
  delete result.align;
  delete result.caption;
  delete result.previewSrc;
  return result;
}

function ImageView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const [loaded, setLoaded] = useState(true);
  const [dragWidth, setDragWidth] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const src = String(node.attrs.src ?? "");
  const previewSrc = String(node.attrs.previewSrc ?? "");
  const alt = String(node.attrs.alt ?? "");
  const title = String(node.attrs.title ?? "");
  const width = normalizeImageWidth(node.attrs.width);
  const align = normalizeImageAlign(node.attrs.align);
  const caption = String(node.attrs.caption ?? "");
  const assetResolver = node.type.spec.config.options.assetResolver as AssetResolver | undefined;
  const displaySrc = imageDisplaySource(src, previewSrc, assetResolver);

  return (
    <NodeViewWrapper
      className={styles.wrapper}
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
          {selected ? (
            <div className={styles.toolbar}>
              <button
                className={styles.toolButton}
                data-active={!align ? "true" : "false"}
                title="自动对齐"
                type="button"
                onClick={() => updateAttributes({ align: null })}
              >
                A
              </button>
              <button
                className={styles.toolButton}
                data-active={align === "left" ? "true" : "false"}
                title="左对齐"
                type="button"
                onClick={() => updateAttributes({ align: "left" })}
              >
                L
              </button>
              <button
                className={styles.toolButton}
                data-active={align === "center" ? "true" : "false"}
                title="居中"
                type="button"
                onClick={() => updateAttributes({ align: "center" })}
              >
                C
              </button>
              <button
                className={styles.toolButton}
                data-active={align === "right" ? "true" : "false"}
                title="右对齐"
                type="button"
                onClick={() => updateAttributes({ align: "right" })}
              >
                R
              </button>
              <span className={styles.divider} />
              <button
                className={styles.toolButton}
                title="适应页面宽度"
                type="button"
                onClick={() => updateAttributes({ width: "100%" })}
              >
                Fit
              </button>
              <button
                className={styles.toolButton}
                disabled={!width}
                title="清除固定宽度"
                type="button"
                onClick={() => updateAttributes({ width: null })}
              >
                Rst
              </button>
              <span className={styles.divider} />
              <button
                className={styles.toolButton}
                title="删除图片"
                type="button"
                onClick={deleteNode}
              >
                Del
              </button>
            </div>
          ) : null}
          {loaded ? (
            <img
              ref={imageRef}
              className={styles.image}
              src={displaySrc}
              alt={alt}
              title={title || undefined}
              style={dragWidth ? { width: dragWidth } : imageStyle(width)}
              onError={() => setLoaded(false)}
            />
          ) : (
            <div className={styles.error} style={imageStyle(width)}>
              <span>图片无法加载</span>
              <code>{src}</code>
            </div>
          )}
          {selected && loaded ? (
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
        {selected ? (
          <input
            className={styles.captionEditor}
            value={caption}
            placeholder="添加图片说明"
            onChange={(event) =>
              updateAttributes({ caption: normalizeNullableText(event.target.value) })
            }
          />
        ) : caption ? (
          <figcaption className={styles.caption}>{caption}</figcaption>
        ) : null}
        {selected ? (
          <div className={styles.metadata}>
            <input
              className={styles.metaInput}
              value={alt}
              placeholder="alt"
              onChange={(event) => updateAttributes({ alt: event.target.value })}
            />
            <input
              className={styles.metaInput}
              value={title}
              placeholder="title"
              onChange={(event) => updateAttributes({ title: event.target.value })}
            />
            {width ? <span className={styles.widthBadge}>{width}</span> : null}
          </div>
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
