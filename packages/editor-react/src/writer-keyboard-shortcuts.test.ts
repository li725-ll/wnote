import { describe, expect, it } from "vitest";
import { writerKeyboardShortcutLabels } from "./writer-keyboard-shortcuts";

describe("writerKeyboardShortcuts", () => {
  it("keeps keyboard-first writing commands discoverable", () => {
    expect(writerKeyboardShortcutLabels).toEqual([
      "Mod-1",
      "Mod-2",
      "Mod-3",
      "Mod-4",
      "Mod-5",
      "Mod-6",
      "Mod-0",
      "Mod-Shift-B",
      "Mod-Shift-U",
      "Mod-Shift-O",
      "Mod-Shift-T",
      "Mod-Shift-`",
      "Mod-Enter",
    ]);
  });
});
