import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { EditorCommandContext } from "./editor-commands";

export type BlockMoveDirection = "up" | "down";
export type BlockInsertPosition = "before" | "after";

interface BlockSiblingInfo {
  from: number;
  to: number;
  index: number;
  parent: ProseMirrorNode;
  node: ProseMirrorNode;
}

export function blockSiblingInfo(
  doc: ProseMirrorNode,
  context?: EditorCommandContext,
): BlockSiblingInfo | null {
  if (!context?.block) return null;
  const blockPos = context.block.pos;
  if (blockPos < 0 || blockPos > doc.content.size) return null;

  const $pos = doc.resolve(blockPos);
  const parent = $pos.parent;
  const index = $pos.index();
  if (index >= parent.childCount) return null;

  const node = parent.child(index);
  if (!node.isBlock) return null;

  const parentStart = $pos.start($pos.depth);
  let from = parentStart;
  for (let offsetIndex = 0; offsetIndex < index; offsetIndex += 1) {
    from += parent.child(offsetIndex).nodeSize;
  }

  return {
    from,
    to: from + node.nodeSize,
    index,
    parent,
    node,
  };
}

export function canMoveBlock(
  doc: ProseMirrorNode,
  context: EditorCommandContext | undefined,
  direction: BlockMoveDirection,
): boolean {
  const info = blockSiblingInfo(doc, context);
  if (!info) return false;
  if (direction === "up") return info.index > 0;
  return info.index < info.parent.childCount - 1;
}

export function moveBlock(
  editor: TiptapEditor,
  context: EditorCommandContext | undefined,
  direction: BlockMoveDirection,
): boolean {
  const info = blockSiblingInfo(editor.state.doc, context);
  if (!info || !canMoveBlock(editor.state.doc, context, direction)) return false;

  const movingNode = info.node.copy(info.node.content);
  const tr = editor.state.tr;
  let selectionPos: number;

  if (direction === "up") {
    const previousNode = info.parent.child(info.index - 1);
    selectionPos = info.from - previousNode.nodeSize;
    tr.delete(info.from, info.to).insert(selectionPos, movingNode);
  } else {
    const nextNode = info.parent.child(info.index + 1);
    selectionPos = info.from + nextNode.nodeSize;
    tr.delete(info.from, info.to).insert(selectionPos, movingNode);
  }

  dispatchWithBlockSelection(editor, tr, selectionPos);
  return true;
}

export function insertEmptyBlock(
  editor: TiptapEditor,
  context: EditorCommandContext | undefined,
  position: BlockInsertPosition,
): boolean {
  const info = blockSiblingInfo(editor.state.doc, context);
  if (!info) return false;
  const paragraph = editor.state.schema.nodes.paragraph?.createAndFill();
  if (!paragraph) return false;

  const insertPos = position === "before" ? info.from : info.to;
  const tr = editor.state.tr.insert(insertPos, paragraph);
  dispatchWithTextSelection(editor, tr, insertPos + 1);
  return true;
}

export function duplicateBlock(
  editor: TiptapEditor,
  context: EditorCommandContext | undefined,
): boolean {
  const info = blockSiblingInfo(editor.state.doc, context);
  if (!info) return false;

  const duplicatedNode = info.node.copy(info.node.content);
  const insertPos = info.to;
  const tr = editor.state.tr.insert(insertPos, duplicatedNode);
  dispatchWithBlockSelection(editor, tr, insertPos);
  return true;
}

function dispatchWithBlockSelection(editor: TiptapEditor, tr: Transaction, pos: number) {
  const selectionPos = clampDocPosition(tr.doc, pos);
  try {
    tr.setSelection(NodeSelection.create(tr.doc, selectionPos));
  } catch {
    tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}

function dispatchWithTextSelection(editor: TiptapEditor, tr: Transaction, pos: number) {
  const selectionPos = clampDocPosition(tr.doc, pos);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}

function clampDocPosition(doc: ProseMirrorNode, pos: number) {
  return Math.max(0, Math.min(pos, doc.content.size));
}
