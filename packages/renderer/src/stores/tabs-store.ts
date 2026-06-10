import { create } from "zustand";
import type { AssetIndex, FileStatDTO } from "@wnote/contracts";
import {
  activeTab as getActiveTab,
  closeTab as closeTabState,
  closeTabsByPath,
  closeTabsByPathPrefix,
  createInitialTabsState,
  createNewTab,
  markActiveTabSaved,
  openFileTab,
  renameTabsPath,
  renameTabsPathPrefix,
  setActiveTabAssets,
  switchTab as switchTabState,
  updateActiveTabContent,
  type DocumentTab,
  type TabsState,
} from "../hooks/tabs-state";

export type { DocumentTab };

let tabCounter = 0;
function genId(): string {
  return `tab-${Date.now()}-${++tabCounter}`;
}

interface TabsStore extends TabsState {
  contentSnapshot: (() => string) | null;
  activeTab: () => DocumentTab;
  newTab: () => string;
  closeTab: (id: string) => void;
  closePath: (path: string) => void;
  closePathPrefix: (path: string) => void;
  switchTab: (id: string) => void;
  updateContent: (content: string, assets?: AssetIndex) => void;
  openFile: (path: string, content: string, assets?: AssetIndex, stat?: FileStatDTO) => string;
  markSaved: (path: string, content: string, stat?: FileStatDTO, assets?: AssetIndex) => void;
  renamePath: (oldPath: string, newPath: string) => void;
  renamePathPrefix: (oldPath: string, newPath: string) => void;
  setAssets: (assets?: AssetIndex) => void;
  setContentSnapshot: (fn: () => string) => void;
}

export const useTabsStore = create<TabsStore>((set, get) => ({
  ...createInitialTabsState(genId),
  contentSnapshot: null,
  activeTab: () => getActiveTab(get()),
  newTab: () => {
    const id = genId();
    set((state) => createNewTab(state, () => id, state.contentSnapshot?.()));
    return id;
  },
  closeTab: (id) => {
    set((state) => closeTabState(state, id, genId));
  },
  closePath: (path) => {
    set((state) => closeTabsByPath(state, path, genId));
  },
  closePathPrefix: (path) => {
    set((state) => closeTabsByPathPrefix(state, path, genId));
  },
  switchTab: (id) => {
    set((state) => switchTabState(state, id, state.contentSnapshot?.()));
  },
  updateContent: (content, assets) => {
    set((state) => updateActiveTabContent(state, content, assets));
  },
  openFile: (path, content, assets, stat) => {
    const next = openFileTab(get(), {
      path,
      content,
      assets,
      stat,
      createId: genId,
      snapshot: get().contentSnapshot?.(),
    });
    set(next);
    return next.activeTabId;
  },
  markSaved: (path, content, stat, assets) => {
    set((state) => markActiveTabSaved(state, path, content, stat, assets));
  },
  renamePath: (oldPath, newPath) => {
    set((state) => renameTabsPath(state, oldPath, newPath));
  },
  renamePathPrefix: (oldPrefix, newPrefix) => {
    set((state) => renameTabsPathPrefix(state, oldPrefix, newPrefix));
  },
  setAssets: (assets) => {
    set((state) => setActiveTabAssets(state, assets));
  },
  setContentSnapshot: (fn) => {
    set({ contentSnapshot: fn });
  },
}));

export function getTabsStore() {
  return useTabsStore.getState();
}
