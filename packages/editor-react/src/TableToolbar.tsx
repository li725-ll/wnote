import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";
import { tableCommands, type EditorCommandDefinition } from "./editor-commands";
import { centeredFloatingPoint } from "./floating-position";
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
  summary: string;
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
  summary: "",
};

const tableToolbarBox = { width: 672, height: 32 };

export const tableToolbarCommandGroups = [
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
    const position = centeredFloatingPoint(
      tableRect,
      {
        ...containerRect,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      },
      tableToolbarBox,
    );
    setState({
      visible: true,
      left: position.left,
      top: position.top,
      placement: position.placement,
      pos: info.pos,
      size: info.node.nodeSize,
      summary: tableToolbarSummary(info.node, editor.state.selection),
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
      <div className={styles.summary} aria-label="Table selection summary">
        {state.summary}
      </div>
      {tableToolbarCommandGroups.map((group, index) => (
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
                disabled={command.canRun ? !command.canRun(editor) : false}
                onClick={() => {
                  command.run(editor, { block: { pos: state.pos, size: state.size } });
                  editor.commands.focus();
                }}
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
  disabled,
  onClick,
}: {
  command: EditorCommandDefinition;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={styles.button}
      data-danger={command.danger ? "true" : "false"}
      disabled={disabled}
      title={command.hint ? `${command.label} - ${command.hint}` : command.label}
      type="button"
      onClick={onClick}
    >
      {tableToolbarLabel(command.id)}
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

export function tableToolbarLabel(id: string): string {
  const labels: Record<string, string> = {
    tableAddRowBefore: "行↑",
    tableAddRowAfter: "行↓",
    tableDeleteRow: "删行",
    tableAddColumnBefore: "列←",
    tableAddColumnAfter: "列→",
    tableDeleteColumn: "删列",
    tableDelete: "删表",
    tableToggleHeaderRow: "表头",
    tableMergeCells: "合并",
    tableSplitCell: "拆分",
  };
  return labels[id] ?? id;
}

export const tableToolbarShortLabel = tableToolbarLabel;

export interface TableDimensions {
  rows: number;
  columns: number;
}

export function tableDimensions(node: ProseMirrorNode): TableDimensions {
  let columns = 0;
  node.forEach((row) => {
    let rowColumns = 0;
    row.forEach((cell) => {
      const colspan = Number(cell.attrs.colspan ?? 1);
      rowColumns += Number.isFinite(colspan) && colspan > 0 ? colspan : 1;
    });
    columns = Math.max(columns, rowColumns);
  });

  return {
    rows: node.childCount,
    columns,
  };
}

export function tableSelectionLabel(selection: Selection): string | null {
  const maybeCellSelection = selection as Selection & {
    isColSelection?: () => boolean;
    isRowSelection?: () => boolean;
    ranges?: readonly unknown[];
  };

  if (
    typeof maybeCellSelection.isRowSelection === "function" &&
    maybeCellSelection.isRowSelection()
  ) {
    return "已选中行";
  }

  if (
    typeof maybeCellSelection.isColSelection === "function" &&
    maybeCellSelection.isColSelection()
  ) {
    return "已选中列";
  }

  const rangeCount = maybeCellSelection.ranges?.length ?? 1;
  return rangeCount > 1 ? `已选 ${rangeCount} 个单元格` : null;
}

export function tableToolbarSummary(node: ProseMirrorNode, selection: Selection): string {
  const dimensions = tableDimensions(node);
  const selectionLabel = tableSelectionLabel(selection);
  const sizeLabel = `${dimensions.rows} 行 x ${dimensions.columns} 列`;
  return selectionLabel ? `${sizeLabel} - ${selectionLabel}` : sizeLabel;
}
