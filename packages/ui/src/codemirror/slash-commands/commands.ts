import type { EditorView } from "@codemirror/view";
import { formatCommands } from "../keybindings";

export type CommandCategory = "heading" | "block" | "inline";

export interface SlashCommand {
  id: string;
  trigger: string;
  label: string;
  keywords: string[];
  icon: string;
  category: CommandCategory;
  action: { type: "format"; run: (view: EditorView) => boolean };
}

function insertTable(view: EditorView): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const table = "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n|  |  |  |";
  const insert = line.text.length === 0 ? table : "\n" + table;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + (line.text.length === 0 ? 2 : 3) },
  });
  return true;
}

export const slashCommandRegistry: SlashCommand[] = [
  {
    id: "heading1",
    trigger: "h1",
    label: "标题 1",
    keywords: ["heading1", "biaoti"],
    icon: "H1",
    category: "heading",
    action: { type: "format", run: formatCommands.heading1 },
  },
  {
    id: "heading2",
    trigger: "h2",
    label: "标题 2",
    keywords: ["heading2", "biaoti"],
    icon: "H2",
    category: "heading",
    action: { type: "format", run: formatCommands.heading2 },
  },
  {
    id: "heading3",
    trigger: "h3",
    label: "标题 3",
    keywords: ["heading3", "biaoti"],
    icon: "H3",
    category: "heading",
    action: { type: "format", run: formatCommands.heading3 },
  },
  {
    id: "heading4",
    trigger: "h4",
    label: "标题 4",
    keywords: ["heading4", "biaoti"],
    icon: "H4",
    category: "heading",
    action: { type: "format", run: formatCommands.heading4 },
  },
  {
    id: "bold",
    trigger: "bold",
    label: "粗体",
    keywords: ["strong", "cuti"],
    icon: "B",
    category: "inline",
    action: { type: "format", run: formatCommands.bold },
  },
  {
    id: "italic",
    trigger: "italic",
    label: "斜体",
    keywords: ["em", "xieti"],
    icon: "I",
    category: "inline",
    action: { type: "format", run: formatCommands.italic },
  },
  {
    id: "strikethrough",
    trigger: "strike",
    label: "删除线",
    keywords: ["del", "shanchuxian"],
    icon: "S",
    category: "inline",
    action: { type: "format", run: formatCommands.strikethrough },
  },
  {
    id: "code",
    trigger: "code",
    label: "行内代码",
    keywords: ["inline", "daima"],
    icon: "<>",
    category: "inline",
    action: { type: "format", run: formatCommands.inlineCode },
  },
  {
    id: "codeblock",
    trigger: "codeblock",
    label: "代码块",
    keywords: ["fence", "daimakuai"],
    icon: "```",
    category: "block",
    action: { type: "format", run: formatCommands.codeBlock },
  },
  {
    id: "blockquote",
    trigger: "quote",
    label: "引用",
    keywords: ["blockquote", "yinyong"],
    icon: ">",
    category: "block",
    action: { type: "format", run: formatCommands.blockquote },
  },
  {
    id: "ul",
    trigger: "ul",
    label: "无序列表",
    keywords: ["bullet", "list", "wuxu"],
    icon: "•",
    category: "block",
    action: { type: "format", run: formatCommands.unorderedList },
  },
  {
    id: "ol",
    trigger: "ol",
    label: "有序列表",
    keywords: ["ordered", "number", "youxu"],
    icon: "1.",
    category: "block",
    action: { type: "format", run: formatCommands.orderedList },
  },
  {
    id: "task",
    trigger: "task",
    label: "任务列表",
    keywords: ["todo", "checkbox", "renwu"],
    icon: "☑",
    category: "block",
    action: { type: "format", run: formatCommands.taskList },
  },
  {
    id: "table",
    trigger: "table",
    label: "表格",
    keywords: ["biaoge"],
    icon: "⊞",
    category: "block",
    action: { type: "format", run: insertTable },
  },
  {
    id: "hr",
    trigger: "hr",
    label: "分割线",
    keywords: ["divider", "horizontal", "fengexian"],
    icon: "─",
    category: "block",
    action: { type: "format", run: formatCommands.horizontalRule },
  },
  {
    id: "image",
    trigger: "img",
    label: "图片",
    keywords: ["image", "picture", "tupian"],
    icon: "🖼",
    category: "inline",
    action: { type: "format", run: formatCommands.image },
  },
  {
    id: "link",
    trigger: "link",
    label: "链接",
    keywords: ["url", "lianjie"],
    icon: "🔗",
    category: "inline",
    action: { type: "format", run: formatCommands.link },
  },
  {
    id: "math",
    trigger: "math",
    label: "数学公式",
    keywords: ["formula", "latex", "shuxue", "gongshi"],
    icon: "∑",
    category: "inline",
    action: { type: "format", run: formatCommands.math },
  },
];
