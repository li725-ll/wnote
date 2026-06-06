import type { EditorRef } from "@wnote/editor-react";

export type EditorFormatCommand = (view: NonNullable<ReturnType<EditorRef["getView"]>>) => boolean;

export const editorFormatCommands = {
  bold: (editor) => editor.chain().focus().toggleBold().run(),
  italic: (editor) => editor.chain().focus().toggleItalic().run(),
  strikethrough: (editor) => editor.chain().focus().toggleStrike().run(),
  inlineCode: (editor) => editor.chain().focus().toggleCode().run(),
  math: (editor) =>
    editor
      .chain()
      .focus()
      .insertContent({ type: "inlineMath", attrs: { formula: "x" } })
      .run(),
  link: (editor) => editor.chain().focus().setLink({ href: "url" }).run(),
  image: (editor) => editor.chain().focus().setImage({ src: "url" }).run(),
  codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  mermaid: (editor) =>
    editor
      .chain()
      .focus()
      .insertContent({ type: "mermaidBlock", attrs: { source: "graph TD\n  A --> B" } })
      .run(),
  blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
  unorderedList: (editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
  taskList: (editor) => editor.chain().focus().toggleTaskList().run(),
  horizontalRule: (editor) => editor.chain().focus().setHorizontalRule().run(),
  tableInsert: (editor) =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  tableAddRowBefore: (editor) => editor.chain().focus().addRowBefore().run(),
  tableAddRowAfter: (editor) => editor.chain().focus().addRowAfter().run(),
  tableDeleteRow: (editor) => editor.chain().focus().deleteRow().run(),
  tableAddColumnBefore: (editor) => editor.chain().focus().addColumnBefore().run(),
  tableAddColumnAfter: (editor) => editor.chain().focus().addColumnAfter().run(),
  tableDeleteColumn: (editor) => editor.chain().focus().deleteColumn().run(),
  tableDelete: (editor) => editor.chain().focus().deleteTable().run(),
  tableToggleHeaderRow: (editor) => editor.chain().focus().toggleHeaderRow().run(),
  tableMergeCells: (editor) => editor.chain().focus().mergeCells().run(),
  tableSplitCell: (editor) => editor.chain().focus().splitCell().run(),
  heading1: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  heading2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  heading3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  heading4: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  heading5: (editor) => editor.chain().focus().toggleHeading({ level: 5 }).run(),
  heading6: (editor) => editor.chain().focus().toggleHeading({ level: 6 }).run(),
  headingClear: (editor) => editor.chain().focus().setParagraph().run(),
} satisfies Record<string, EditorFormatCommand>;
