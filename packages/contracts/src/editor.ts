export type EditorCommandId =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inlineCode"
  | "math"
  | "link"
  | "image"
  | "codeBlock"
  | "mermaid"
  | "blockquote"
  | "unorderedList"
  | "orderedList"
  | "taskList"
  | "horizontalRule"
  | "tableInsert"
  | "tableAddRowBefore"
  | "tableAddRowAfter"
  | "tableDeleteRow"
  | "tableAddColumnBefore"
  | "tableAddColumnAfter"
  | "tableDeleteColumn"
  | "tableDelete"
  | "tableToggleHeaderRow"
  | "tableMergeCells"
  | "tableSplitCell"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "headingClear";

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  from: number;
}
