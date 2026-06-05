import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { tableCommands, type EditorCommandDefinition } from "./editor-commands";
import styles from "./TableToolbar.module.css";

interface TableToolbarProps {
  editor: TiptapEditor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface TableState {
  visible: boolean;
  left: number;
  top: number;
  placement: "top" | "bottom";
  pos: number;
  size: number;
}

interface TableInfo {
  pos: number;
  node: ProseMirrorNode;
}

const hiddenState: TableState = {
  visible: false,
  left: 0,
  top: 0,
  placement: "top",
  pos: 0,
  size: 0,
};

const commandGroups = [
  ["tableAddRowBefore", "tableAddRowAfter", "tableDeleteRow"],
  ["tableAddColumnBefore", "tableAddColumnAfter", "tableDeleteColumn"],
  ["tableToggleHeaderRow", "tableMergeCells", "tableSplitCell"],
  ["tableDelete"],
] as const;

export function TableToolbar({ editor, containerRef }: TableToolbarProps) {
  const [state, setState] = useState<TableState>(hiddenState);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setState(hiddenState);
      return;
    }

    const container = containerRef.current;
    const info = currentTable(editor);
    if (!container || !info || !editor.isFocused) {
      setState((current) => (current.visible ? hiddenState : current));
      return;
    }

    const table = tableElement(editor, info.pos);
    if (!table) {
      setState(hiddenState);
      return;
    }

    const tableRect = table.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const placeBelow = tableRect.top - containerRect.top < 44;
    setState({
      visible: true,
      left: tableRect.left - containerRect.left + container.scrollLeft,
      top:
        (placeBelow ? tableRect.bottom - containerRect.top : tableRect.top - containerRect.top) +
        container.scrollTop +
        (placeBelow ? 8 : -8),
      placement: placeBelow ? "bottom" : "top",
      pos: info.pos,
      size: info.node.nodeSize,
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
    container.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, update]);

  if (!editor || !state.visible) return null;

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      contentEditable={false}
      data-placement={state.placement}
      style={{ left: state.left, top: state.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {commandGroups.map((group, index) => (
        <div
          key={group.join(":")}
          className={styles.group}
          data-danger={index === 3 ? "true" : "false"}
        >
          {group.map((id) => {
            const command = tableCommands.find((item) => item.id === id);
            if (!command) return null;
            return (
              <ToolbarButton
                key={command.id}
                command={command}
                onClick={() => command.run(editor, { block: { pos: state.pos, size: state.size } })}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ToolbarButton({
  command,
  onClick,
}: {
  command: EditorCommandDefinition;
  onClick: () => void;
}) {
  return (
    <button
      className={styles.button}
      data-danger={command.danger ? "true" : "false"}
      title={command.hint ? `${command.label} - ${command.hint}` : command.label}
      type="button"
      onClick={onClick}
    >
      {shortLabel(command.id)}
    </button>
  );
}

function currentTable(editor: TiptapEditor): TableInfo | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return { pos: $from.before(depth), node };
    }
  }
  return null;
}

function tableElement(editor: TiptapEditor, pos: number): HTMLElement | null {
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLTableElement) return dom;
  if (dom instanceof HTMLElement) return dom.querySelector("table") ?? dom;
  return null;
}

function shortLabel(id: string): string {
  const labels: Record<string, string> = {
    tableAddRowBefore: "+R↑",
    tableAddRowAfter: "+R↓",
    tableDeleteRow: "-R",
    tableAddColumnBefore: "+C←",
    tableAddColumnAfter: "+C→",
    tableDeleteColumn: "-C",
    tableDelete: "Del",
    tableToggleHeaderRow: "TH",
    tableMergeCells: "Merge",
    tableSplitCell: "Split",
  };
  return labels[id] ?? id;
}
