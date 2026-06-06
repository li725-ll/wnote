import { Extension } from "@tiptap/core";
import { runEditorCommand } from "./editor-commands";

export const writerKeyboardShortcutLabels = [
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
] as const;

export const WriterKeyboardShortcuts = Extension.create({
  name: "writerKeyboardShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-1": () => runEditorCommand(this.editor, "heading1"),
      "Mod-2": () => runEditorCommand(this.editor, "heading2"),
      "Mod-3": () => runEditorCommand(this.editor, "heading3"),
      "Mod-4": () => runEditorCommand(this.editor, "heading4"),
      "Mod-5": () => runEditorCommand(this.editor, "heading5"),
      "Mod-6": () => runEditorCommand(this.editor, "heading6"),
      "Mod-0": () => runEditorCommand(this.editor, "headingClear"),
      "Mod-Shift-B": () => runEditorCommand(this.editor, "blockquote"),
      "Mod-Shift-U": () => runEditorCommand(this.editor, "unorderedList"),
      "Mod-Shift-O": () => runEditorCommand(this.editor, "orderedList"),
      "Mod-Shift-T": () => runEditorCommand(this.editor, "taskList"),
      "Mod-Shift-`": () => runEditorCommand(this.editor, "codeBlock"),
      "Mod-Enter": () => runEditorCommand(this.editor, "horizontalRule"),
    };
  },
});
