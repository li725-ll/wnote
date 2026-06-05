import { describe, expect, it } from "vitest";
import { blockMenuCommands, slashCommands, editorCommands, tableCommands } from "./editor-commands";
import { tableToolbarCommandGroups, tableToolbarShortLabel } from "./TableToolbar";

describe("editor commands", () => {
  it("filters slash commands by id and labels", () => {
    expect(slashCommands("heading").map((command) => command.id)).toEqual([
      "heading1",
      "heading2",
      "heading3",
      "heading4",
    ]);
    expect(slashCommands("公式").map((command) => command.id)).toContain("math");
    expect(slashCommands("table").map((command) => command.id)).toEqual(["tableInsert"]);
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
    ]);
  });

  it("keeps table toolbar groups in a stable layout", () => {
    expect(tableToolbarCommandGroups).toEqual([
      ["tableAddRowBefore", "tableAddRowAfter", "tableDeleteRow"],
      ["tableAddColumnBefore", "tableAddColumnAfter", "tableDeleteColumn"],
      ["tableToggleHeaderRow", "tableMergeCells", "tableSplitCell"],
      ["tableDelete"],
    ]);
  });

  it("keeps table toolbar labels compact", () => {
    expect(tableCommands.map((command) => tableToolbarShortLabel(command.id))).toEqual([
      "+Row↑",
      "+Row↓",
      "-Row",
      "+Col←",
      "+Col→",
      "-Col",
      "Del",
      "TH",
      "Merge",
      "Split",
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
});
