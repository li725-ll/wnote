import { createContext, useContext } from "react";
import type { EditorState, EditorAction } from "./types";

export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export const EditorContext = createContext<EditorContextValue>(null!);

export function useEditor(): EditorContextValue {
  return useContext(EditorContext);
}
