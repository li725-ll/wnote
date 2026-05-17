import type { BlockNode } from "@wnote/md-parser";

export interface EditorBlock {
  id: string;
  node: BlockNode;
}

export type Theme = "light" | "dark";
export type EditorMode = "wysiwyg" | "source";

export interface EditorState {
  blocks: EditorBlock[];
  focusedId: string | null;
  focusDirection: "up" | "down" | "click" | null;
  theme: Theme;
  mode: EditorMode;
}

export type FormatCommand = "bold" | "italic" | "strikethrough" | "code" | "link";

export type EditorAction =
  | { type: "INIT"; blocks: EditorBlock[] }
  | { type: "FOCUS"; id: string; direction?: "up" | "down" | "click" }
  | { type: "BLUR" }
  | { type: "UPDATE_BLOCK"; id: string; node: BlockNode }
  | { type: "INSERT_AFTER"; afterId: string; block: EditorBlock }
  | { type: "DELETE_BLOCK"; id: string }
  | { type: "MOVE_FOCUS"; direction: "up" | "down" }
  | { type: "SET_THEME"; theme: Theme }
  | { type: "SET_MODE"; mode: EditorMode };

export interface EditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
}
