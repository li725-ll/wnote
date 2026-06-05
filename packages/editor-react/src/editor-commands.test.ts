import { describe, expect, it } from "vitest";
import { blockMenuCommands, slashCommands, editorCommands, tableCommands } from "./editor-commands";

describe("editor commands", () => {
  it("filters slash commands by id and labels", () => {
    expect(slashCommands("heading").map((command) => command.id)).toEqual([
      "heading1",
      "heading2",
      "heading3",
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
      "insert",
      "danger",
    ]);
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

  it("marks delete table as the only dangerous table command", () => {
    expect(tableCommands.filter((command) => command.danger).map((command) => command.id)).toEqual([
      "tableDelete",
    ]);
  });
});
