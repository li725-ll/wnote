import { describe, expect, it, vi } from "vitest";
import { buildPaletteCommands, type PaletteCommandActions } from "./palette-commands";

function createActions(): PaletteCommandActions {
  return {
    newFile: vi.fn(),
    openFile: vi.fn(),
    save: vi.fn(),
    openExportDialog: vi.fn(),
    toggleOutline: vi.fn(),
    runFormat: vi.fn(),
  };
}

describe("palette commands", () => {
  it("builds stable command metadata", () => {
    const commands = buildPaletteCommands(createActions());

    expect(commands).toHaveLength(39);
    expect(commands.slice(0, 7).map((command) => command.id)).toEqual([
      "new-file",
      "open-file",
      "save",
      "save-as",
      "export-html",
      "export-pdf",
      "toggle-outline",
    ]);
    expect(commands.find((command) => command.id === "bold")).toMatchObject({
      label: "粗体",
      group: "格式",
      shortcut: "⌘B",
    });
    expect(commands.find((command) => command.id === "table-merge-cells")).toMatchObject({
      label: "合并单元格",
      group: "表格",
    });
  });

  it("wires file and export actions", () => {
    const actions = createActions();
    const commands = buildPaletteCommands(actions);

    commands.find((command) => command.id === "new-file")?.run();
    commands.find((command) => command.id === "open-file")?.run();
    commands.find((command) => command.id === "save")?.run();
    commands.find((command) => command.id === "save-as")?.run();
    commands.find((command) => command.id === "export-html")?.run();
    commands.find((command) => command.id === "export-pdf")?.run();
    commands.find((command) => command.id === "toggle-outline")?.run();

    expect(actions.newFile).toHaveBeenCalledTimes(1);
    expect(actions.openFile).toHaveBeenCalledTimes(1);
    expect(actions.save).toHaveBeenNthCalledWith(1, false);
    expect(actions.save).toHaveBeenNthCalledWith(2, true);
    expect(actions.openExportDialog).toHaveBeenNthCalledWith(1, "html");
    expect(actions.openExportDialog).toHaveBeenNthCalledWith(2, "pdf");
    expect(actions.toggleOutline).toHaveBeenCalledTimes(1);
  });

  it("runs editor format commands through the injected formatter", () => {
    const actions = createActions();
    const commands = buildPaletteCommands(actions);

    commands.find((command) => command.id === "bold")?.run();
    commands.find((command) => command.id === "table-delete")?.run();

    expect(actions.runFormat).toHaveBeenCalledTimes(2);
    expect(actions.runFormat).toHaveBeenCalledWith(expect.any(Function));
  });
});
