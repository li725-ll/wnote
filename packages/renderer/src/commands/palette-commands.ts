import type { EditorRef } from "@wnote/editor-react";
import type { PaletteCommand } from "../components/CommandPalette";
import type { ExportFormat } from "../export/export-state";
import { editorFormatCommands, type EditorFormatCommand } from "./editor-format-commands";

export interface PaletteCommandActions {
  newFile: () => void;
  openFile: () => void | Promise<void>;
  save: (saveAs?: boolean) => void | Promise<void>;
  openExportDialog: (format: ExportFormat) => void;
  toggleOutline: () => void;
  runFormat: (command: EditorFormatCommand) => void;
}

interface FormatPaletteCommandDefinition {
  id: string;
  label: string;
  keywords: string[];
  group: string;
  shortcut?: string;
  command: EditorFormatCommand;
}

const formatPaletteCommands: FormatPaletteCommandDefinition[] = [
  {
    id: "heading1",
    label: "标题 1",
    keywords: ["h1", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘1",
    command: editorFormatCommands.heading1,
  },
  {
    id: "heading2",
    label: "标题 2",
    keywords: ["h2", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘2",
    command: editorFormatCommands.heading2,
  },
  {
    id: "heading3",
    label: "标题 3",
    keywords: ["h3", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘3",
    command: editorFormatCommands.heading3,
  },
  {
    id: "heading4",
    label: "标题 4",
    keywords: ["h4", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘4",
    command: editorFormatCommands.heading4,
  },
  {
    id: "heading5",
    label: "标题 5",
    keywords: ["h5", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘5",
    command: editorFormatCommands.heading5,
  },
  {
    id: "heading6",
    label: "标题 6",
    keywords: ["h6", "heading", "biaoti"],
    group: "格式",
    shortcut: "⌘6",
    command: editorFormatCommands.heading6,
  },
  {
    id: "heading-clear",
    label: "清除标题",
    keywords: ["heading clear", "biaoti"],
    group: "格式",
    shortcut: "⌘0",
    command: editorFormatCommands.headingClear,
  },
  {
    id: "bold",
    label: "粗体",
    keywords: ["bold", "strong", "cuti"],
    group: "格式",
    shortcut: "⌘B",
    command: editorFormatCommands.bold,
  },
  {
    id: "italic",
    label: "斜体",
    keywords: ["italic", "xieti"],
    group: "格式",
    shortcut: "⌘I",
    command: editorFormatCommands.italic,
  },
  {
    id: "strike",
    label: "删除线",
    keywords: ["strike", "del", "shanchu"],
    group: "格式",
    shortcut: "⇧⌘X",
    command: editorFormatCommands.strikethrough,
  },
  {
    id: "link",
    label: "链接",
    keywords: ["link", "url", "lianjie"],
    group: "格式",
    command: editorFormatCommands.link,
  },
  {
    id: "inline-code",
    label: "行内代码",
    keywords: ["code", "inline", "daima"],
    group: "格式",
    shortcut: "⌘E",
    command: editorFormatCommands.inlineCode,
  },
  {
    id: "code-block",
    label: "代码块",
    keywords: ["codeblock", "fence", "daimakuai"],
    group: "格式",
    shortcut: "⇧⌘`",
    command: editorFormatCommands.codeBlock,
  },
  {
    id: "mermaid",
    label: "Mermaid 图表",
    keywords: ["mermaid", "diagram", "flowchart", "liuchengtu"],
    group: "格式",
    command: editorFormatCommands.mermaid,
  },
  {
    id: "blockquote",
    label: "引用",
    keywords: ["quote", "blockquote", "yinyong"],
    group: "格式",
    shortcut: "⇧⌘B",
    command: editorFormatCommands.blockquote,
  },
  {
    id: "unordered-list",
    label: "无序列表",
    keywords: ["ul", "list", "bullet", "wuxu"],
    group: "格式",
    shortcut: "⇧⌘U",
    command: editorFormatCommands.unorderedList,
  },
  {
    id: "ordered-list",
    label: "有序列表",
    keywords: ["ol", "list", "ordered", "youxu"],
    group: "格式",
    shortcut: "⇧⌘O",
    command: editorFormatCommands.orderedList,
  },
  {
    id: "task-list",
    label: "任务列表",
    keywords: ["task", "todo", "renwu"],
    group: "格式",
    shortcut: "⇧⌘T",
    command: editorFormatCommands.taskList,
  },
  {
    id: "horizontal-rule",
    label: "分割线",
    keywords: ["hr", "divider", "fengexian"],
    group: "格式",
    shortcut: "⌘↵",
    command: editorFormatCommands.horizontalRule,
  },
  {
    id: "table-insert",
    label: "插入表格",
    keywords: ["table", "insert", "biaoge"],
    group: "表格",
    command: editorFormatCommands.tableInsert,
  },
  {
    id: "table-add-row-before",
    label: "上方插入行",
    keywords: ["table", "row", "before", "shangfang"],
    group: "表格",
    command: editorFormatCommands.tableAddRowBefore,
  },
  {
    id: "table-add-row-after",
    label: "下方插入行",
    keywords: ["table", "row", "after", "xiafang"],
    group: "表格",
    command: editorFormatCommands.tableAddRowAfter,
  },
  {
    id: "table-delete-row",
    label: "删除当前行",
    keywords: ["table", "row", "delete", "shanchu"],
    group: "表格",
    command: editorFormatCommands.tableDeleteRow,
  },
  {
    id: "table-add-column-before",
    label: "左侧插入列",
    keywords: ["table", "column", "before", "zuoce"],
    group: "表格",
    command: editorFormatCommands.tableAddColumnBefore,
  },
  {
    id: "table-add-column-after",
    label: "右侧插入列",
    keywords: ["table", "column", "after", "youce"],
    group: "表格",
    command: editorFormatCommands.tableAddColumnAfter,
  },
  {
    id: "table-delete-column",
    label: "删除当前列",
    keywords: ["table", "column", "delete", "shanchu"],
    group: "表格",
    command: editorFormatCommands.tableDeleteColumn,
  },
  {
    id: "table-toggle-header-row",
    label: "切换表头行",
    keywords: ["table", "header", "biaotou"],
    group: "表格",
    command: editorFormatCommands.tableToggleHeaderRow,
  },
  {
    id: "table-merge-cells",
    label: "合并单元格",
    keywords: ["table", "merge", "hebing"],
    group: "表格",
    command: editorFormatCommands.tableMergeCells,
  },
  {
    id: "table-split-cell",
    label: "拆分单元格",
    keywords: ["table", "split", "chaifen"],
    group: "表格",
    command: editorFormatCommands.tableSplitCell,
  },
  {
    id: "table-delete",
    label: "删除表格",
    keywords: ["table", "delete", "shanchu"],
    group: "表格",
    command: editorFormatCommands.tableDelete,
  },
  {
    id: "image",
    label: "图片",
    keywords: ["image", "img", "tupian"],
    group: "格式",
    shortcut: "⇧⌘I",
    command: editorFormatCommands.image,
  },
  {
    id: "math",
    label: "数学公式",
    keywords: ["math", "formula", "shuxue"],
    group: "格式",
    shortcut: "⌘M",
    command: editorFormatCommands.math,
  },
];

export function buildPaletteCommands(actions: PaletteCommandActions): PaletteCommand[] {
  return [
    {
      id: "new-file",
      label: "新建文档",
      keywords: ["new", "file", "xinjian", "wendang"],
      group: "文件",
      shortcut: "⌘N",
      run: actions.newFile,
    },
    {
      id: "open-file",
      label: "打开文件",
      keywords: ["open", "file", "dakai"],
      group: "文件",
      shortcut: "⌘O",
      run: actions.openFile,
    },
    {
      id: "save",
      label: "保存",
      keywords: ["save", "baocun"],
      group: "文件",
      shortcut: "⌘S",
      run: () => actions.save(false),
    },
    {
      id: "save-as",
      label: "另存为",
      keywords: ["save as", "lingcun"],
      group: "文件",
      shortcut: "⇧⌘S",
      run: () => actions.save(true),
    },
    {
      id: "export-html",
      label: "导出为 HTML",
      keywords: ["export", "html", "daochu"],
      group: "文件",
      shortcut: "⇧⌘E",
      run: () => actions.openExportDialog("html"),
    },
    {
      id: "export-pdf",
      label: "导出为 PDF",
      keywords: ["export", "pdf", "daochu"],
      group: "文件",
      shortcut: "⇧⌘P",
      run: () => actions.openExportDialog("pdf"),
    },
    {
      id: "toggle-outline",
      label: "显示/隐藏大纲",
      keywords: ["outline", "sidebar", "dagang", "cebian"],
      group: "视图",
      shortcut: "⌘\\",
      run: actions.toggleOutline,
    },
    ...formatPaletteCommands.map((command) => ({
      id: command.id,
      label: command.label,
      keywords: command.keywords,
      group: command.group,
      shortcut: command.shortcut,
      run: () => actions.runFormat(command.command),
    })),
  ];
}
