import { describe, expect, it } from "vitest";
import {
  blockMenuCommands,
  slashCommandGroups,
  slashCommands,
  editorCommands,
  tableCommands,
} from "./editor-commands";
import {
  tableDimensions,
  tableSelectionLabel,
  tableToolbarCommandGroups,
  tableToolbarShortLabel,
  tableToolbarSummary,
} from "./TableToolbar";

describe("editor commands", () => {
  it("filters slash commands by id and labels", () => {
    expect(slashCommands("heading").map((command) => command.id)).toEqual([
      "heading1",
      "heading2",
      "heading3",
      "heading4",
      "heading5",
      "heading6",
    ]);
    expect(slashCommands("公式").map((command) => command.id)).toContain("math");
    expect(slashCommands("table").map((command) => command.id)).toEqual(["tableInsert"]);
    expect(slashCommands("h6").map((command) => command.id)).toEqual(["heading6"]);
    expect(slashCommands("todo").map((command) => command.id)).toEqual(["taskList"]);
    expect(slashCommands("diagram").map((command) => command.id)).toEqual(["mermaid"]);
  });

  it("groups slash commands for menu display", () => {
    expect(slashCommandGroups("").map((group) => [group.id, group.commands.length])).toEqual([
      ["block", 12],
      ["insert", 5],
    ]);
    expect(slashCommandGroups("table").map((group) => group.id)).toEqual(["insert"]);
  });

  it("keeps block menu commands grouped in menu order", () => {
    expect(blockMenuCommands.map((command) => command.group)).toEqual([
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "block",
      "insert",
      "insert",
      "insert",
      "insert",
      "insert",
      "danger",
    ]);
  });

  it("exposes block menu commands in a stable order", () => {
    expect(blockMenuCommands.map((command) => command.id)).toEqual([
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "heading4",
      "heading5",
      "heading6",
      "blockquote",
      "unorderedList",
      "orderedList",
      "taskList",
      "codeBlock",
      "blockMoveUp",
      "blockMoveDown",
      "blockInsertBefore",
      "blockInsertAfter",
      "blockDuplicate",
      "tableInsert",
      "horizontalRule",
      "deleteBlock",
    ]);
  });

  it("guards block management commands with canRun", () => {
    const guardedIds = [
      "blockMoveUp",
      "blockMoveDown",
      "blockInsertBefore",
      "blockInsertAfter",
      "blockDuplicate",
      "deleteBlock",
    ];
    expect(
      blockMenuCommands
        .filter((command) => guardedIds.includes(command.id))
        .every((command) => typeof command.canRun === "function"),
    ).toBe(true);
  });

  it("keeps the public math command mapped to inline math", () => {
    expect(editorCommands.some((command) => command.id === "inlineMath")).toBe(true);
    expect(editorCommands.some((command) => command.id === "math")).toBe(true);
  });

  it("exposes table toolbar commands in a stable order", () => {
    expect(tableCommands.map((command) => command.id)).toEqual([
      "tableAddRowBefore",
      "tableAddRowAfter",
      "tableDeleteRow",
      "tableAddColumnBefore",
      "tableAddColumnAfter",
      "tableDeleteColumn",
      "tableDelete",
      "tableToggleHeaderRow",
      "tableMergeCells",
      "tableSplitCell",
      "tableAlignLeft",
      "tableAlignCenter",
      "tableAlignRight",
    ]);
  });

  it("keeps table toolbar groups in a stable layout", () => {
    expect(tableToolbarCommandGroups).toEqual([
      ["tableAddRowBefore", "tableAddRowAfter", "tableDeleteRow"],
      ["tableAddColumnBefore", "tableAddColumnAfter", "tableDeleteColumn"],
      ["tableToggleHeaderRow", "tableMergeCells", "tableSplitCell"],
      ["tableAlignLeft", "tableAlignCenter", "tableAlignRight"],
      ["tableDelete"],
    ]);
  });

  it("keeps table toolbar labels compact", () => {
    expect(tableCommands.map((command) => tableToolbarShortLabel(command.id))).toEqual([
      "行↑",
      "行↓",
      "删行",
      "列←",
      "列→",
      "删列",
      "删表",
      "表头",
      "合并",
      "拆分",
      "左",
      "中",
      "右",
    ]);
  });

  it("guards every table command with canRun", () => {
    expect(tableCommands.every((command) => typeof command.canRun === "function")).toBe(true);
  });

  it("marks delete table as the only dangerous table command", () => {
    expect(tableCommands.filter((command) => command.danger).map((command) => command.id)).toEqual([
      "tableDelete",
    ]);
  });

  it("summarizes table dimensions from row and cell structure", () => {
    const node = {
      childCount: 2,
      forEach(
        callback: (row: { forEach: (cellCallback: (cell: unknown) => void) => void }) => void,
      ) {
        callback({
          forEach(cellCallback) {
            cellCallback({ attrs: { colspan: 1 } });
            cellCallback({ attrs: { colspan: 2 } });
          },
        });
        callback({
          forEach(cellCallback) {
            cellCallback({ attrs: { colspan: 1 } });
            cellCallback({ attrs: { colspan: 1 } });
          },
        });
      },
    };

    expect(tableDimensions(node as never)).toEqual({ rows: 2, columns: 3 });
  });

  it("labels table row, column, and multi-cell selections", () => {
    expect(tableSelectionLabel({ isRowSelection: () => true } as never)).toBe("已选中行");
    expect(tableSelectionLabel({ isColSelection: () => true } as never)).toBe("已选中列");
    expect(tableSelectionLabel({ ranges: [{}, {}] } as never)).toBe("已选 2 个单元格");
    expect(tableSelectionLabel({ ranges: [{}] } as never)).toBeNull();
  });

  it("summarizes table size and selection in Chinese", () => {
    const node = {
      childCount: 2,
      forEach(
        callback: (row: { forEach: (cellCallback: (cell: unknown) => void) => void }) => void,
      ) {
        callback({
          forEach(cellCallback) {
            cellCallback({ attrs: { colspan: 1 } });
            cellCallback({ attrs: { colspan: 1 } });
          },
        });
        callback({
          forEach(cellCallback) {
            cellCallback({ attrs: { colspan: 1 } });
            cellCallback({ attrs: { colspan: 1 } });
          },
        });
      },
    };

    expect(tableToolbarSummary(node as never, { ranges: [{}, {}] } as never)).toBe(
      "2 行 x 2 列 - 已选 2 个单元格",
    );
  });
});
