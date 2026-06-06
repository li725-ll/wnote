import type { EditorCommandId } from "@wnote/contracts";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { canMoveBlock, duplicateBlock, insertEmptyBlock, moveBlock } from "./block-operations";

export type EditorCommandGroup = "format" | "block" | "insert" | "table" | "danger";

export interface EditorCommandContext {
  block?: {
    pos: number;
    size: number;
  };
}

export interface EditorCommandDefinition {
  id: string;
  label: string;
  hint?: string;
  group: EditorCommandGroup;
  slash?: boolean;
  blockMenu?: boolean;
  danger?: boolean;
  canRun?(editor: TiptapEditor, context?: EditorCommandContext): boolean;
  run(editor: TiptapEditor, context?: EditorCommandContext, payload?: unknown): boolean;
}

export const editorCommands: EditorCommandDefinition[] = [
  {
    id: "paragraph",
    label: "段落",
    hint: "普通文本",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).setParagraph().run(),
  },
  {
    id: "heading1",
    label: "标题 1",
    hint: "一级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "标题 2",
    hint: "二级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "标题 3",
    hint: "三级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 3 }).run(),
  },
  {
    id: "heading4",
    label: "标题 4",
    hint: "四级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 4 }).run(),
  },
  {
    id: "heading5",
    label: "标题 5",
    hint: "五级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 5 }).run(),
  },
  {
    id: "heading6",
    label: "标题 6",
    hint: "六级标题",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleHeading({ level: 6 }).run(),
  },
  {
    id: "headingClear",
    label: "正文",
    group: "block",
    run: (editor, context) => blockChain(editor, context).setParagraph().run(),
  },
  {
    id: "blockquote",
    label: "引用",
    hint: "引用块",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleBlockquote().run(),
  },
  {
    id: "unorderedList",
    label: "无序列表",
    hint: "项目符号",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "有序列表",
    hint: "编号列表",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleOrderedList().run(),
  },
  {
    id: "taskList",
    label: "任务列表",
    hint: "待办项",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleTaskList().run(),
  },
  {
    id: "codeBlock",
    label: "代码块",
    hint: "带高亮",
    group: "block",
    slash: true,
    blockMenu: true,
    run: (editor, context) => blockChain(editor, context).toggleCodeBlock().run(),
  },
  {
    id: "blockMoveUp",
    label: "上移当前块",
    group: "block",
    blockMenu: true,
    canRun: (editor, context) => canMoveBlock(editor.state.doc, context, "up"),
    run: (editor, context) => moveBlock(editor, context, "up"),
  },
  {
    id: "blockMoveDown",
    label: "下移当前块",
    group: "block",
    blockMenu: true,
    canRun: (editor, context) => canMoveBlock(editor.state.doc, context, "down"),
    run: (editor, context) => moveBlock(editor, context, "down"),
  },
  {
    id: "blockInsertBefore",
    label: "上方插入块",
    group: "insert",
    blockMenu: true,
    canRun: (_editor, context) => Boolean(context?.block),
    run: (editor, context) => insertEmptyBlock(editor, context, "before"),
  },
  {
    id: "blockInsertAfter",
    label: "下方插入块",
    group: "insert",
    blockMenu: true,
    canRun: (_editor, context) => Boolean(context?.block),
    run: (editor, context) => insertEmptyBlock(editor, context, "after"),
  },
  {
    id: "blockDuplicate",
    label: "复制当前块",
    group: "insert",
    blockMenu: true,
    canRun: (_editor, context) => Boolean(context?.block),
    run: (editor, context) => duplicateBlock(editor, context),
  },
  {
    id: "tableInsert",
    label: "表格",
    hint: "3 x 3",
    group: "insert",
    slash: true,
    blockMenu: true,
    run: (editor, context) =>
      editor
        .chain()
        .focus()
        .setTextSelection(blockEnd(editor, context))
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: "image",
    label: "图片",
    hint: "占位路径",
    group: "insert",
    slash: true,
    run: (editor, _context, payload) => {
      const src = typeof payload === "string" ? payload : "url";
      return editor.chain().focus().setImage({ src }).run();
    },
  },
  {
    id: "math",
    label: "公式",
    hint: "块公式",
    group: "insert",
    slash: true,
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({ type: "blockMath", attrs: { formula: "x" } })
        .run(),
  },
  {
    id: "inlineMath",
    label: "行内公式",
    group: "format",
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({ type: "inlineMath", attrs: { formula: "x" } })
        .run(),
  },
  {
    id: "mermaid",
    label: "Mermaid",
    hint: "图表",
    group: "insert",
    slash: true,
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({ type: "mermaidBlock", attrs: { source: "graph TD\n  A --> B" } })
        .run(),
  },
  {
    id: "horizontalRule",
    label: "分割线",
    hint: "水平线",
    group: "insert",
    slash: true,
    blockMenu: true,
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "deleteBlock",
    label: "删除当前块",
    group: "danger",
    blockMenu: true,
    danger: true,
    canRun: (_editor, context) => Boolean(context?.block),
    run: (editor, context) => {
      if (!context?.block) return false;
      return editor
        .chain()
        .focus()
        .deleteRange({ from: context.block.pos, to: context.block.pos + context.block.size })
        .run();
    },
  },
  {
    id: "bold",
    label: "加粗",
    group: "format",
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "斜体",
    group: "format",
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: "strikethrough",
    label: "删除线",
    group: "format",
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: "inlineCode",
    label: "行内代码",
    group: "format",
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: "link",
    label: "链接",
    group: "format",
    run: (editor, _context, payload) => {
      const href = typeof payload === "string" ? payload : "url";
      return editor.chain().focus().setLink({ href }).run();
    },
  },
  {
    id: "tableAddRowBefore",
    label: "上方插入行",
    hint: "在当前行上方插入一行",
    group: "table",
    canRun: (editor) => editor.can().addRowBefore(),
    run: (editor) => editor.chain().focus().addRowBefore().run(),
  },
  {
    id: "tableAddRowAfter",
    label: "下方插入行",
    hint: "在当前行下方插入一行",
    group: "table",
    canRun: (editor) => editor.can().addRowAfter(),
    run: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    id: "tableDeleteRow",
    label: "删除行",
    hint: "删除当前行",
    group: "table",
    canRun: (editor) => editor.can().deleteRow(),
    run: (editor) => editor.chain().focus().deleteRow().run(),
  },
  {
    id: "tableAddColumnBefore",
    label: "左侧插入列",
    hint: "在当前列左侧插入一列",
    group: "table",
    canRun: (editor) => editor.can().addColumnBefore(),
    run: (editor) => editor.chain().focus().addColumnBefore().run(),
  },
  {
    id: "tableAddColumnAfter",
    label: "右侧插入列",
    hint: "在当前列右侧插入一列",
    group: "table",
    canRun: (editor) => editor.can().addColumnAfter(),
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    id: "tableDeleteColumn",
    label: "删除列",
    hint: "删除当前列",
    group: "table",
    canRun: (editor) => editor.can().deleteColumn(),
    run: (editor) => editor.chain().focus().deleteColumn().run(),
  },
  {
    id: "tableDelete",
    label: "删除表格",
    hint: "删除整张表格",
    group: "table",
    danger: true,
    canRun: (editor) => editor.can().deleteTable(),
    run: (editor) => editor.chain().focus().deleteTable().run(),
  },
  {
    id: "tableToggleHeaderRow",
    label: "切换表头",
    hint: "切换首行为表头",
    group: "table",
    canRun: (editor) => editor.can().toggleHeaderRow(),
    run: (editor) => editor.chain().focus().toggleHeaderRow().run(),
  },
  {
    id: "tableMergeCells",
    label: "合并单元格",
    hint: "合并选中的单元格",
    group: "table",
    canRun: (editor) => editor.can().mergeCells(),
    run: (editor) => editor.chain().focus().mergeCells().run(),
  },
  {
    id: "tableSplitCell",
    label: "拆分单元格",
    hint: "拆分当前单元格",
    group: "table",
    canRun: (editor) => editor.can().splitCell(),
    run: (editor) => editor.chain().focus().splitCell().run(),
  },
];

export const blockMenuCommands = editorCommands.filter((command) => command.blockMenu);
export const tableCommands = editorCommands.filter((command) => command.group === "table");

export function slashCommands(query: string) {
  const normalized = query.trim().toLowerCase();
  const commands = editorCommands.filter((command) => command.slash);
  if (!normalized) return commands;
  return commands.filter((command) => {
    const haystack = [command.id, command.label, command.hint]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function runEditorCommand(
  editor: TiptapEditor,
  id: EditorCommandId | string,
  context?: EditorCommandContext,
  payload?: unknown,
): boolean {
  const commandId = id === "math" ? "inlineMath" : id;
  const command = editorCommands.find((item) => item.id === commandId);
  return command?.run(editor, context, payload) ?? false;
}

function blockChain(editor: TiptapEditor, context?: EditorCommandContext) {
  return editor.chain().focus().setTextSelection(blockCursor(editor, context));
}

function blockCursor(editor: TiptapEditor, context?: EditorCommandContext) {
  if (!context?.block) return editor.state.selection.from;
  return Math.min(context.block.pos + 1, editor.state.doc.content.size);
}

function blockEnd(editor: TiptapEditor, context?: EditorCommandContext) {
  if (!context?.block) return editor.state.selection.from;
  return Math.min(context.block.pos + context.block.size, editor.state.doc.content.size);
}
