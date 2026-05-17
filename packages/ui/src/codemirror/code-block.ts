import { EditorView, keymap } from "@codemirror/view";
import { ensureSyntaxTree } from "@codemirror/language";

const FENCE_RE = /^(`{3,}|~{3,})/;
const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;

function findFencedCode(view: EditorView, pos: number): { from: number; to: number } | null {
  const tree = ensureSyntaxTree(view.state, pos + 1, 200);
  if (!tree) return findFencedCodeFallback(view, pos);
  let result: { from: number; to: number } | null = null;
  tree.iterate({
    enter(node) {
      if (node.name === "FencedCode" && node.from <= pos && node.to >= pos) {
        result = { from: node.from, to: node.to };
        return false;
      }
    },
  });
  return result ?? findFencedCodeFallback(view, pos);
}

function findFencedCodeFallback(
  view: EditorView,
  pos: number,
): { from: number; to: number } | null {
  const { state } = view;
  const line = state.doc.lineAt(pos);

  let openLine = -1;
  for (let i = line.number; i >= 1; i--) {
    const l = state.doc.line(i);
    if (FENCE_RE.test(l.text)) {
      openLine = i;
      break;
    }
  }
  if (openLine === -1) return null;

  const openL = state.doc.line(openLine);
  let closeLine = -1;
  for (let i = openLine + 1; i <= state.doc.lines; i++) {
    const l = state.doc.line(i);
    if (FENCE_CLOSE_RE.test(l.text)) {
      closeLine = i;
      break;
    }
  }
  if (closeLine === -1) return null;

  const closeL = state.doc.line(closeLine);
  if (pos < openL.from || pos > closeL.to) return null;

  return { from: openL.from, to: closeL.to };
}

function deleteCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const sel = state.selection.main;
  if (sel.from !== sel.to) return false;

  const line = state.doc.lineAt(sel.from);
  if (!FENCE_RE.test(line.text)) return false;

  const code = findFencedCode(view, sel.from);
  if (!code) return false;

  let deleteTo = code.to;
  if (deleteTo < state.doc.length) deleteTo += 1;

  view.dispatch({
    changes: { from: code.from, to: deleteTo, insert: "" },
    selection: { anchor: code.from },
  });

  return true;
}

function closeFencedCode(view: EditorView): boolean {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);

  const fenceMatch = FENCE_RE.exec(line.text);
  if (!fenceMatch) return false;

  if (findFencedCode(view, from)) return false;

  const fence = fenceMatch[1];
  view.dispatch({
    changes: { from: line.to, insert: "\n\n" + fence },
    selection: { anchor: line.to + 1 },
  });

  return true;
}

function exitCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);

  if (line.text.trim() !== "") return false;

  const code = findFencedCode(view, from);
  if (!code) return false;

  const endLine = state.doc.lineAt(code.to > code.from ? code.to - 1 : code.to);
  const hasFence = FENCE_CLOSE_RE.test(endLine.text) && endLine.number > line.number;

  if (hasFence) {
    for (let i = line.number + 1; i < endLine.number; i++) {
      if (state.doc.line(i).text.trim() !== "") return false;
    }

    const removeFrom = line.from > 0 ? line.from - 1 : line.from;
    const removeTo = endLine.from > 0 ? endLine.from - 1 : endLine.from;
    const insertAfter = endLine.to;

    if (insertAfter >= state.doc.length) {
      view.dispatch({
        changes: [
          { from: removeFrom, to: removeTo, insert: "" },
          { from: insertAfter, to: insertAfter, insert: "\n" },
        ],
        selection: { anchor: insertAfter - (removeTo - removeFrom) + 1 },
      });
    } else {
      view.dispatch({
        changes: { from: removeFrom, to: removeTo, insert: "" },
        selection: { anchor: insertAfter - (removeTo - removeFrom) + 1 },
      });
    }
  } else {
    const openLine = state.doc.lineAt(code.from);
    const openMatch = FENCE_RE.exec(openLine.text);
    const fence = openMatch ? openMatch[1] : "```";

    const removeFrom = line.from > 0 ? line.from - 1 : line.from;
    const removeTo = code.to;
    const insert = "\n" + fence + "\n";

    view.dispatch({
      changes: { from: removeFrom, to: removeTo, insert },
      selection: { anchor: removeFrom + insert.length },
    });
  }

  return true;
}

export const codeBlockCompletion = keymap.of([
  {
    key: "Enter",
    run: (view) => closeFencedCode(view) || exitCodeBlock(view),
  },
  {
    key: "Backspace",
    run: deleteCodeBlock,
  },
]);
