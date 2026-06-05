import { keymap, EditorView } from "@codemirror/view";
import type { KeyBinding } from "@codemirror/view";

function wrapSelection(view: EditorView, marker: string): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    selected.length > marker.length * 2
  ) {
    view.dispatch({
      changes: { from, to, insert: selected.slice(marker.length, -marker.length) },
      selection: { anchor: from, head: to - marker.length * 2 },
    });
    return true;
  }

  const before = view.state.sliceDoc(from - marker.length, from);
  const after = view.state.sliceDoc(to, to + marker.length);
  if (before === marker && after === marker) {
    view.dispatch({
      changes: [
        { from: from - marker.length, to: from, insert: "" },
        { from: to, to: to + marker.length, insert: "" },
      ],
      selection: { anchor: from - marker.length, head: to - marker.length },
    });
    return true;
  }

  const insert = `${marker}${selected}${marker}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + marker.length, head: from + marker.length + selected.length },
  });
  return true;
}

function insertLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const insert = `[${selected || "text"}](url)`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + 1, head: from + 1 + (selected.length || 4) },
  });
  return true;
}

function insertImage(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const insert = `![${selected || "alt"}](url)`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + 2, head: from + 2 + (selected.length || 3) },
  });
  return true;
}

function setHeadingLevel(view: EditorView, level: number): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const text = line.text;
  const stripped = text.replace(/^#{1,6}\s*/, "");
  const prefix = level > 0 ? "#".repeat(level) + " " : "";
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: prefix + stripped },
    selection: { anchor: line.from + prefix.length },
  });
  return true;
}

function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);
  const changes: { from: number; to?: number; insert: string }[] = [];
  let allHavePrefix = true;

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    if (!line.text.startsWith(prefix)) {
      allHavePrefix = false;
      break;
    }
  }

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    if (allHavePrefix) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
    } else if (!line.text.startsWith(prefix)) {
      changes.push({ from: line.from, insert: prefix });
    }
  }

  view.dispatch({ changes });
  return true;
}

function insertCodeBlock(view: EditorView): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const insert = line.text.length === 0 ? "```\n\n```" : "\n```\n\n```";
  const offset = line.text.length === 0 ? 4 : 5;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + offset },
  });
  return true;
}

function insertMermaidBlock(view: EditorView): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const template = "```mermaid\ngraph TD\n  A[开始] --> B[结束]\n```";
  const insert = line.text.length === 0 ? template : "\n" + template;
  const offset = line.text.length === 0 ? 11 : 12;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + offset, head: line.to + offset + 8 },
  });
  return true;
}

function insertHorizontalRule(view: EditorView): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const insert = line.text.length === 0 ? "---\n" : "\n---\n";
  const offset = line.text.length === 0 ? 4 : 5;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + offset },
  });
  return true;
}

export const formatCommands = {
  bold: (v: EditorView) => wrapSelection(v, "**"),
  italic: (v: EditorView) => wrapSelection(v, "*"),
  strikethrough: (v: EditorView) => wrapSelection(v, "~~"),
  inlineCode: (v: EditorView) => wrapSelection(v, "`"),
  math: (v: EditorView) => wrapSelection(v, "$"),
  link: insertLink,
  image: insertImage,
  codeBlock: insertCodeBlock,
  mermaid: insertMermaidBlock,
  blockquote: (v: EditorView) => toggleLinePrefix(v, "> "),
  unorderedList: (v: EditorView) => toggleLinePrefix(v, "- "),
  orderedList: (v: EditorView) => toggleLinePrefix(v, "1. "),
  taskList: (v: EditorView) => toggleLinePrefix(v, "- [ ] "),
  horizontalRule: insertHorizontalRule,
  heading1: (v: EditorView) => setHeadingLevel(v, 1),
  heading2: (v: EditorView) => setHeadingLevel(v, 2),
  heading3: (v: EditorView) => setHeadingLevel(v, 3),
  heading4: (v: EditorView) => setHeadingLevel(v, 4),
  headingClear: (v: EditorView) => setHeadingLevel(v, 0),
};

const bindings: KeyBinding[] = [
  { key: "Mod-b", run: formatCommands.bold },
  { key: "Mod-i", run: formatCommands.italic },
  { key: "Mod-Shift-x", run: formatCommands.strikethrough },
  { key: "Mod-`", run: formatCommands.inlineCode },
  { key: "Mod-Shift-m", run: formatCommands.math },
  { key: "Mod-Shift-i", run: formatCommands.image },
  { key: "Mod-Shift-`", run: formatCommands.codeBlock },
  { key: "Mod-Shift-q", run: formatCommands.blockquote },
  { key: "Mod-Shift-u", run: formatCommands.unorderedList },
  { key: "Mod-Shift-o", run: formatCommands.orderedList },
  { key: "Mod-Shift-t", run: formatCommands.taskList },
  { key: "Mod-Enter", run: formatCommands.horizontalRule },
  { key: "Mod-1", run: formatCommands.heading1 },
  { key: "Mod-2", run: formatCommands.heading2 },
  { key: "Mod-3", run: formatCommands.heading3 },
  { key: "Mod-4", run: formatCommands.heading4 },
  { key: "Mod-0", run: formatCommands.headingClear },
];

export const markdownKeybindings = keymap.of(bindings);
