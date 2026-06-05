import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { centeredFloatingPoint } from "./floating-position";
import styles from "./FloatingToolbar.module.css";

interface FloatingToolbarProps {
  editor: TiptapEditor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ToolbarState {
  visible: boolean;
  left: number;
  top: number;
  placement: "top" | "bottom";
}

const hiddenState: ToolbarState = { visible: false, left: 0, top: 0, placement: "top" };
const toolbarBox = { width: 220, height: 32 };

export function FloatingToolbar({ editor, containerRef }: FloatingToolbarProps) {
  const [state, setState] = useState<ToolbarState>(hiddenState);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const popoverRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setState(hiddenState);
      return;
    }
    const { selection } = editor.state;
    if (selection.empty || (!editor.isFocused && !linkOpen)) {
      setState(hiddenState);
      return;
    }
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, "", "");
    if (!selectedText.trim()) {
      setState(hiddenState);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const start = editor.view.coordsAtPos(selection.from);
    const end = editor.view.coordsAtPos(selection.to);
    const containerRect = container.getBoundingClientRect();
    const position = centeredFloatingPoint(
      {
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
        width: Math.abs(end.right - start.left),
        height: Math.abs(end.bottom - start.top),
      },
      {
        ...containerRect,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      },
      toolbarBox,
    );
    setState({
      visible: true,
      ...position,
    });
  }, [containerRef, editor, linkOpen]);

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
    container.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, update]);

  useEffect(() => {
    if (!linkOpen) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [linkOpen]);

  useEffect(() => {
    if (!linkOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && popoverRef.current?.contains(target)) return;
      setLinkOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [linkOpen]);

  if (!state.visible || !editor) return null;

  return (
    <div
      className={styles.toolbar}
      contentEditable={false}
      data-placement={state.placement}
      style={{ left: state.left, top: state.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarButton
        active={editor.isActive("bold")}
        label="加粗"
        onClick={() => toggleBold(editor)}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        label="斜体"
        onClick={() => toggleItalic(editor)}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        label="删除线"
        onClick={() => toggleStrike(editor)}
      >
        S
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        label="行内代码"
        onClick={() => toggleCode(editor)}
      >
        {"</>"}
      </ToolbarButton>
      <span className={styles.divider} />
      <ToolbarButton active={editor.isActive("link")} label="链接" onClick={() => openLink(editor)}>
        Link
      </ToolbarButton>
      <ToolbarButton label="公式" onClick={() => insertInlineMath(editor)}>
        Fx
      </ToolbarButton>
      {linkOpen ? (
        <form
          ref={popoverRef}
          className={styles.popover}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            applyLink(editor);
          }}
        >
          <input
            ref={inputRef}
            className={styles.input}
            value={linkHref}
            placeholder="https://"
            onChange={(event) => setLinkHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
          />
          <button className={styles.apply} type="submit">
            确定
          </button>
          <button
            className={styles.apply}
            type="button"
            onClick={() => {
              setLinkOpen(false);
              editor.commands.focus();
            }}
          >
            取消
          </button>
        </form>
      ) : null}
    </div>
  );

  function openLink(targetEditor: TiptapEditor) {
    const { from, to } = targetEditor.state.selection;
    savedSelectionRef.current = { from, to };
    const href = targetEditor.getAttributes("link").href as string | undefined;
    setLinkHref(href ?? "https://");
    setLinkOpen(true);
  }

  function applyLink(targetEditor: TiptapEditor) {
    const selection = savedSelectionRef.current;
    if (!selection) return;
    const href = linkHref.trim();
    const chain = targetEditor.chain().focus().setTextSelection(selection);
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href }).run();
    setLinkOpen(false);
  }
}

function ToolbarButton({
  active = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={styles.button}
      data-active={active ? "true" : "false"}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function toggleBold(editor: TiptapEditor) {
  editor.chain().focus().toggleBold().run();
}

function toggleItalic(editor: TiptapEditor) {
  editor.chain().focus().toggleItalic().run();
}

function toggleStrike(editor: TiptapEditor) {
  editor.chain().focus().toggleStrike().run();
}

function toggleCode(editor: TiptapEditor) {
  editor.chain().focus().toggleCode().run();
}

function insertInlineMath(editor: TiptapEditor) {
  editor
    .chain()
    .focus()
    .insertContent({ type: "inlineMath", attrs: { formula: "x" } })
    .run();
}
