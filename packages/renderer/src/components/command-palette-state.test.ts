import { describe, expect, it } from "vitest";
import {
  clampCommandPaletteSelected,
  filterCommandPaletteCommands,
  isCommandPaletteToggleKey,
  nextCommandPaletteSelected,
  normalizeCommandPaletteQuery,
  reconcileCommandPaletteSelected,
} from "./command-palette-state";

const commands = [
  {
    id: "new",
    label: "新建文件",
    group: "文件",
    keywords: ["new", "file"],
    shortcut: "⌘N",
  },
  {
    id: "exportPdf",
    label: "导出 PDF",
    group: "导出",
    keywords: ["export", "pdf"],
    shortcut: "⇧⌘P",
  },
  {
    id: "bold",
    label: "加粗",
    group: "编辑",
    keywords: ["bold"],
    shortcut: "⌘B",
  },
];

describe("command palette state", () => {
  it("normalizes queries", () => {
    expect(normalizeCommandPaletteQuery("  PDF  ")).toBe("pdf");
  });

  it("filters commands by label group shortcut and keywords", () => {
    expect(filterCommandPaletteCommands(commands, "new").map((command) => command.id)).toEqual([
      "new",
    ]);
    expect(filterCommandPaletteCommands(commands, "导出 pdf").map((command) => command.id)).toEqual(
      ["exportPdf"],
    );
    expect(filterCommandPaletteCommands(commands, "⌘B").map((command) => command.id)).toEqual([
      "bold",
    ]);
  });

  it("limits filtered commands", () => {
    expect(filterCommandPaletteCommands(commands, "", 2).map((command) => command.id)).toEqual([
      "new",
      "exportPdf",
    ]);
  });

  it("clamps selected index to available items", () => {
    expect(clampCommandPaletteSelected(3, 3)).toBe(2);
    expect(clampCommandPaletteSelected(-1, 3)).toBe(0);
    expect(clampCommandPaletteSelected(Number.NaN, 3)).toBe(0);
    expect(clampCommandPaletteSelected(1, 0)).toBe(0);
  });

  it("resets selection when query changes", () => {
    expect(reconcileCommandPaletteSelected({ selected: 2, itemCount: 3, queryChanged: true })).toBe(
      0,
    );
    expect(
      reconcileCommandPaletteSelected({ selected: 2, itemCount: 2, queryChanged: false }),
    ).toBe(1);
  });

  it("wraps arrow navigation and jumps to edges", () => {
    expect(nextCommandPaletteSelected(2, 3, "ArrowDown")).toBe(0);
    expect(nextCommandPaletteSelected(0, 3, "ArrowUp")).toBe(2);
    expect(nextCommandPaletteSelected(2, 3, "Home")).toBe(0);
    expect(nextCommandPaletteSelected(0, 3, "End")).toBe(2);
    expect(nextCommandPaletteSelected(0, 0, "End")).toBe(0);
  });

  it("detects the global command palette toggle shortcut", () => {
    expect(isCommandPaletteToggleKey(key("k", { metaKey: true }))).toBe(true);
    expect(isCommandPaletteToggleKey(key("K", { ctrlKey: true }))).toBe(true);
    expect(isCommandPaletteToggleKey(key("k", { metaKey: true, shiftKey: true }))).toBe(false);
    expect(isCommandPaletteToggleKey(key("p", { metaKey: true }))).toBe(false);
    expect(isCommandPaletteToggleKey(key("k"))).toBe(false);
  });
});

function key(
  value: string,
  modifiers: Partial<Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "shiftKey">> = {},
) {
  return {
    key: value,
    metaKey: modifiers.metaKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
  };
}
