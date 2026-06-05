import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { blockMenuCommands, type EditorCommandDefinition } from "./editor-commands";
import { sideHandlePoint, type RectLike } from "./floating-position";
import styles from "./BlockHandle.module.css";

interface BlockHandleProps {
  editor: TiptapEditor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ActiveBlock {
  visible: boolean;
  left: number;
  top: number;
  pos: number;
  size: number;
  type: string;
}

interface BlockInfo {
  pos: number;
  node: ProseMirrorNode;
}

const hiddenBlock: ActiveBlock = {
  visible: false,
  left: 0,
  top: 0,
  pos: 0,
  size: 0,
  type: "",
};

const blockHandleBox = { width: 24, height: 24 };

export function BlockHandle({ editor, containerRef }: BlockHandleProps) {
  const [block, setBlock] = useState<ActiveBlock>(hiddenBlock);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setBlock(hiddenBlock);
      setMenuOpen(false);
      return;
    }
    const container = containerRef.current;
    if (!container || !editor.isFocused) {
      if (!menuOpen) setBlock(hiddenBlock);
      return;
    }

    const info = currentBlock(editor);
    if (!info) {
      setBlock(hiddenBlock);
      return;
    }

    const element = blockElement(editor, info.pos);
    const editorRect = rectLike(editor.view.dom.getBoundingClientRect());
    const containerRect = rectLike(container.getBoundingClientRect());
    const blockRect = rectLike(
      element?.getBoundingClientRect() ?? editor.view.coordsAtPos(info.pos),
    );
    if (!finiteRect(editorRect) || !finiteRect(containerRect) || !finiteRect(blockRect)) {
      setBlock(hiddenBlock);
      return;
    }
    const position = sideHandlePoint(
      editorRect,
      blockRect,
      {
        ...containerRect,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      },
      blockHandleBox,
    );
    if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
      setBlock(hiddenBlock);
      return;
    }
    setBlock({
      visible: true,
      left: position.left,
      top: position.top,
      pos: info.pos,
      size: info.node.nodeSize,
      type: info.node.type.name,
    });
  }, [containerRef, editor, menuOpen]);

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
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!editor || !block.visible) return null;
  const commandContext = { block: { pos: block.pos, size: block.size } };

  const execute = (command: EditorCommandDefinition) => {
    if (command.canRun && !command.canRun(editor, commandContext)) return;
    command.run(editor, commandContext);
    setMenuOpen(false);
  };

  return (
    <div
      ref={menuRef}
      className={styles.root}
      contentEditable={false}
      style={{ left: block.left, top: block.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        className={styles.handle}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={blockLabel(block.type)}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
      >
        +
      </button>
      {menuOpen ? (
        <div className={styles.menu} role="menu" aria-label="块操作">
          {blockMenuCommands.map((command, index) => (
            <FragmentMenuItem
              key={command.id}
              command={command}
              divider={index > 0 && command.group !== blockMenuCommands[index - 1]?.group}
              disabled={command.canRun ? !command.canRun(editor, commandContext) : false}
              onClick={() => execute(command)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FragmentMenuItem({
  command,
  divider,
  disabled,
  onClick,
}: {
  command: EditorCommandDefinition;
  divider: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Fragment>
      {divider ? <span className={styles.divider} /> : null}
      <button
        className={styles.menuButton}
        data-danger={command.danger ? "true" : "false"}
        disabled={disabled}
        role="menuitem"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onClick();
        }}
      >
        {command.label}
      </button>
    </Fragment>
  );
}

function currentBlock(editor: TiptapEditor): BlockInfo | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.isBlock) {
    return { pos: selection.from, node: selection.node };
  }

  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!node.isBlock) continue;
    if (node.type.name === "doc" || node.type.name === "listItem") continue;
    return { pos: $from.before(depth), node };
  }
  return null;
}

function blockElement(editor: TiptapEditor, pos: number): HTMLElement | null {
  const dom = editor.view.nodeDOM(pos);
  return dom instanceof HTMLElement ? dom : null;
}

function rectLike(rect: Pick<RectLike, "left" | "right" | "top" | "bottom">): RectLike {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

function finiteRect(rect: RectLike): boolean {
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.right) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.bottom) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  );
}

function blockLabel(type: string): string {
  const labels: Record<string, string> = {
    blockquote: "引用块",
    bulletList: "无序列表",
    codeBlock: "代码块",
    heading: "标题",
    image: "图片",
    mermaidBlock: "Mermaid",
    orderedList: "有序列表",
    paragraph: "段落",
    table: "表格",
    taskList: "任务列表",
  };
  return labels[type] ?? "块操作";
}
