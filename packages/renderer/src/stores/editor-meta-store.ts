import { create } from "zustand";
import type { HeadingItem } from "@wnote/editor-react";

interface EditorMetaStore {
  headings: HeadingItem[];
  editorReadySignal: number;
  setHeadings: (headings: HeadingItem[]) => void;
  markEditorReady: () => void;
}

export const useEditorMetaStore = create<EditorMetaStore>((set) => ({
  headings: [],
  editorReadySignal: 0,
  setHeadings: (headings) => set({ headings }),
  markEditorReady: () => set((state) => ({ editorReadySignal: state.editorReadySignal + 1 })),
}));
