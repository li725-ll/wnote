import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  blockSiblingInfo,
  canMoveBlock,
  duplicateBlock,
  insertEmptyBlock,
  moveBlock,
} from "./block-operations";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "text*", group: "block" },
    text: { group: "inline" },
  },
  marks: {},
});

function paragraph(text: string) {
  return schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
}

function docWithBlocks(...texts: string[]) {
  return schema.nodes.doc.create(
    null,
    texts.map((text) => paragraph(text)),
  );
}

function blockTexts(doc = docWithBlocks()) {
  const texts: string[] = [];
  doc.forEach((node) => texts.push(node.textContent));
  return texts;
}

function editorForDoc(doc = docWithBlocks()) {
  let state = EditorState.create({ schema, doc });
  return {
    get state() {
      return state;
    },
    view: {
      dispatch(transaction) {
        state = state.apply(transaction);
      },
    },
    commands: {
      focus: () => true,
    },
  } as TiptapEditor;
}

describe("block operations", () => {
  it("resolves a block at a document position", () => {
    const doc = docWithBlocks("a", "bb", "ccc");
    const first = blockSiblingInfo(doc, { block: { pos: 0, size: 3 } });
    const second = blockSiblingInfo(doc, { block: { pos: 3, size: 4 } });

    expect(first).toMatchObject({ from: 0, to: 3, index: 0 });
    expect(first?.node.textContent).toBe("a");
    expect(second).toMatchObject({ from: 3, to: 7, index: 1 });
    expect(second?.node.textContent).toBe("bb");
  });

  it("guards move boundaries", () => {
    const doc = docWithBlocks("a", "b", "c");

    expect(canMoveBlock(doc, { block: { pos: 0, size: 3 } }, "up")).toBe(false);
    expect(canMoveBlock(doc, { block: { pos: 0, size: 3 } }, "down")).toBe(true);
    expect(canMoveBlock(doc, { block: { pos: 3, size: 3 } }, "up")).toBe(true);
    expect(canMoveBlock(doc, { block: { pos: 6, size: 3 } }, "down")).toBe(false);
  });

  it("rejects missing or invalid block contexts", () => {
    const doc = docWithBlocks("a");

    expect(blockSiblingInfo(doc)).toBeNull();
    expect(blockSiblingInfo(doc, { block: { pos: 99, size: 0 } })).toBeNull();
    expect(canMoveBlock(doc, undefined, "up")).toBe(false);
  });

  it("moves blocks up and down without changing content", () => {
    const editor = editorForDoc(docWithBlocks("a", "b", "c"));

    expect(moveBlock(editor, { block: { pos: 3, size: 3 } }, "up")).toBe(true);
    expect(blockTexts(editor.state.doc)).toEqual(["b", "a", "c"]);

    expect(moveBlock(editor, { block: { pos: 0, size: 3 } }, "down")).toBe(true);
    expect(blockTexts(editor.state.doc)).toEqual(["a", "b", "c"]);
  });

  it("inserts empty blocks around the selected block", () => {
    const editor = editorForDoc(docWithBlocks("a"));

    expect(insertEmptyBlock(editor, { block: { pos: 0, size: 3 } }, "before")).toBe(true);
    expect(blockTexts(editor.state.doc)).toEqual(["", "a"]);

    expect(insertEmptyBlock(editor, { block: { pos: 2, size: 3 } }, "after")).toBe(true);
    expect(blockTexts(editor.state.doc)).toEqual(["", "a", ""]);
  });

  it("duplicates the selected block after itself", () => {
    const editor = editorForDoc(docWithBlocks("a", "b"));

    expect(duplicateBlock(editor, { block: { pos: 0, size: 3 } })).toBe(true);
    expect(blockTexts(editor.state.doc)).toEqual(["a", "a", "b"]);
  });
});
