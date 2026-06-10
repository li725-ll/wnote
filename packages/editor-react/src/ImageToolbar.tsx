import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { nearbyFloatingPoint } from "./floating-position";
import { normalizeImageAlign, normalizeImageWidth, normalizeNullableText } from "./image-utils";
import { selectedImageInfo } from "./image";
import styles from "./Image.module.css";

interface ImageToolbarProps {
  editor: TiptapEditor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onImageSave?: (file: File) => Promise<{ src: string; previewSrc?: string } | null>;
  onImageReveal?: (src: string) => void;
  onImagePathCopy?: (src: string) => void;
}

interface ImageToolbarState {
  visible: boolean;
  left: number;
  top: number;
  placement: "top" | "bottom" | "left" | "right";
  pos: number;
  nodeSize: number;
  attrs: Record<string, unknown>;
}

const hiddenState: ImageToolbarState = {
  visible: false,
  left: 0,
  top: 0,
  placement: "top",
  pos: 0,
  nodeSize: 0,
  attrs: {},
};

const imageToolbarBox = { width: 360, height: 122 };

export function ImageToolbar({
  editor,
  containerRef,
  onImageSave,
  onImageReveal,
  onImagePathCopy,
}: ImageToolbarProps) {
  const [state, setState] = useState<ImageToolbarState>(hiddenState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointerRef = useRef<{ left: number; top: number } | null>(null);
  const src = String(state.attrs.src ?? "");
  const align = normalizeImageAlign(state.attrs.align);
  const width = normalizeImageWidth(state.attrs.width);
  const caption = String(state.attrs.caption ?? "");
  const alt = String(state.attrs.alt ?? "");
  const title = String(state.attrs.title ?? "");

  const update = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setState(hiddenState);
      return;
    }
    const container = containerRef.current;
    const info = selectedImageInfo(editor);
    if (!container || !info || !editor.isFocused) {
      setState((current) => (current.visible ? hiddenState : current));
      return;
    }

    const anchor = info.element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const position = nearbyFloatingPoint(
      anchor,
      pointerRef.current,
      {
        ...containerRect,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      },
      imageToolbarBox,
    );
    setState({
      visible: true,
      left: position.left,
      top: position.top,
      placement: position.placement,
      pos: info.pos,
      nodeSize: info.nodeSize,
      attrs: info.attrs,
    });
  }, [containerRef, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", update);
    };
  }, [editor, update]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const trackPointer = (event: PointerEvent) => {
      pointerRef.current = { left: event.clientX, top: event.clientY };
      window.setTimeout(update, 0);
    };
    container.addEventListener("pointerdown", trackPointer);
    container.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("pointerdown", trackPointer);
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, update]);

  if (!editor || !state.visible) return null;

  return (
    <div
      className={styles.floatingPanel}
      contentEditable={false}
      data-placement={state.placement}
      style={{ left: state.left, top: state.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className={styles.toolbarRow}>
        <ImageButton
          active={!align}
          label="自动对齐"
          onClick={() => patchAttrs(editor, state, { align: null })}
        >
          A
        </ImageButton>
        <ImageButton
          active={align === "left"}
          label="左对齐"
          onClick={() => patchAttrs(editor, state, { align: "left" })}
        >
          L
        </ImageButton>
        <ImageButton
          active={align === "center"}
          label="居中"
          onClick={() => patchAttrs(editor, state, { align: "center" })}
        >
          C
        </ImageButton>
        <ImageButton
          active={align === "right"}
          label="右对齐"
          onClick={() => patchAttrs(editor, state, { align: "right" })}
        >
          R
        </ImageButton>
        <span className={styles.divider} />
        <ImageButton
          label="适应页面宽度"
          onClick={() => patchAttrs(editor, state, { width: "100%" })}
        >
          Fit
        </ImageButton>
        <ImageButton
          active={width === "50%"}
          label="50% 宽度"
          onClick={() => patchAttrs(editor, state, { width: "50%" })}
        >
          50
        </ImageButton>
        <ImageButton
          active={width === "75%"}
          label="75% 宽度"
          onClick={() => patchAttrs(editor, state, { width: "75%" })}
        >
          75
        </ImageButton>
        <ImageButton
          disabled={!width}
          label="清除固定宽度"
          onClick={() => patchAttrs(editor, state, { width: null })}
        >
          Rst
        </ImageButton>
        <span className={styles.divider} />
        <ImageButton
          disabled={!onImageSave}
          label="替换图片"
          onClick={() => fileInputRef.current?.click()}
        >
          Rep
        </ImageButton>
        <ImageButton
          disabled={!src || !onImageReveal}
          label="在文件夹中显示"
          onClick={() => onImageReveal?.(src)}
        >
          Rev
        </ImageButton>
        <ImageButton
          disabled={!src || !onImagePathCopy}
          label="复制路径"
          onClick={() => onImagePathCopy?.(src)}
        >
          Path
        </ImageButton>
        <ImageButton label="删除图片" onClick={() => deleteImage(editor, state)}>
          Del
        </ImageButton>
      </div>
      <div className={styles.toolbarFields}>
        <input
          className={styles.metaInput}
          value={caption}
          placeholder="图片说明"
          onChange={(event) =>
            patchAttrs(editor, state, { caption: normalizeNullableText(event.target.value) })
          }
        />
        <input
          className={styles.metaInput}
          value={alt}
          placeholder="alt"
          onChange={(event) => patchAttrs(editor, state, { alt: event.target.value })}
        />
        <input
          className={styles.metaInput}
          value={title}
          placeholder="title"
          onChange={(event) => patchAttrs(editor, state, { title: event.target.value })}
        />
      </div>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !onImageSave) return;
          void onImageSave(file).then((asset) => {
            if (!asset) return;
            patchAttrs(editor, state, { src: asset.src, previewSrc: asset.previewSrc ?? null });
          });
        }}
      />
    </div>
  );
}

function ImageButton({
  active = false,
  disabled = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={styles.toolButton}
      data-active={active ? "true" : "false"}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function patchAttrs(
  editor: TiptapEditor,
  state: Pick<ImageToolbarState, "pos" | "attrs">,
  patch: Record<string, unknown>,
) {
  const node = editor.state.doc.nodeAt(state.pos);
  if (node?.type.name !== "image") return;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(state.pos, undefined, { ...state.attrs, ...patch });
      return true;
    })
    .run();
}

function deleteImage(editor: TiptapEditor, state: Pick<ImageToolbarState, "pos" | "nodeSize">) {
  editor
    .chain()
    .focus()
    .deleteRange({ from: state.pos, to: state.pos + state.nodeSize })
    .run();
}
