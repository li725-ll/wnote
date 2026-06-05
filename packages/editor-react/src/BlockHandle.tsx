import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { blockMenuCommands, type EditorCommandDefinition } from "./editor-commands";
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
    const editorRect = editor.view.dom.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const blockRect = element?.getBoundingClientRect() ?? editor.view.coordsAtPos(info.pos);
    setBlock({
      visible: true,
      left: editorRect.left - containerRect.left + container.scrollLeft - 30,
      top: blockRect.top - containerRect.top + container.scrollTop + 2,
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

  const execute = (command: EditorCommandDefinition) => {
    command.run(editor, { block: { pos: block.pos, size: block.size } });
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
        title={blockLabel(block.type)}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
      >
        +
      </button>
      {menuOpen ? (
        <div className={styles.menu}>
          {blockMenuCommands.map((command, index) => (
            <FragmentMenuItem
              key={command.id}
              command={command}
              divider={index > 0 && command.group !== blockMenuCommands[index - 1]?.group}
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
  onClick,
}: {
  command: EditorCommandDefinition;
  divider: boolean;
  onClick: () => void;
}) {
  return (
    <Fragment>
      {divider ? <span className={styles.divider} /> : null}
      <button
        className={styles.menuButton}
        data-danger={command.danger ? "true" : "false"}
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
