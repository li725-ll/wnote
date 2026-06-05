import type { EditorCommandId } from "@wnote/contracts";

export const editorCommandIds = [
  "bold",
  "italic",
  "strikethrough",
  "inlineCode",
  "math",
  "link",
  "image",
  "codeBlock",
  "mermaid",
  "blockquote",
  "unorderedList",
  "orderedList",
  "taskList",
  "horizontalRule",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "headingClear",
] as const satisfies readonly EditorCommandId[];

export type EditorCommandPayload = Record<string, unknown>;
