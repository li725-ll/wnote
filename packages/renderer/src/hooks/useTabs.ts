import { useState, useCallback, useRef } from "react";
import type { AssetIndex } from "@wnote/contracts";
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
  type TabsState,
} from "./tabs-state";

export type { DocumentTab } from "./tabs-state";

let tabCounter = 0;
function genId(): string {
  return `tab-${Date.now()}-${++tabCounter}`;
}

export function useTabs() {
  const [state, setState] = useState<TabsState>(() => createInitialTabsState(genId));
  const stateRef = useRef(state);
  const contentSnapshotRef = useRef<(() => string) | null>(null);
  stateRef.current = state;

  const { tabs, activeTabId } = state;
  const activeTab = getActiveTab(state);

  const applyState = useCallback((next: TabsState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const setContentSnapshot = useCallback((fn: () => string) => {
    contentSnapshotRef.current = fn;
  }, []);

  const newTab = useCallback(() => {
    const id = genId();
    applyState(createNewTab(stateRef.current, () => id, contentSnapshotRef.current?.()));
    return id;
  }, [applyState]);

  const closeTab = useCallback(
    (id: string) => {
      applyState(closeTabState(stateRef.current, id, genId));
    },
    [applyState],
  );

  const closePath = useCallback(
    (path: string) => {
      applyState(closeTabsByPath(stateRef.current, path, genId));
    },
    [applyState],
  );

  const closePathPrefix = useCallback(
    (path: string) => {
      applyState(closeTabsByPathPrefix(stateRef.current, path, genId));
    },
    [applyState],
  );

  const switchTab = useCallback(
    (id: string) => {
      applyState(switchTabState(stateRef.current, id, contentSnapshotRef.current?.()));
    },
    [applyState],
  );

  const updateContent = useCallback(
    (content: string, assets?: AssetIndex) => {
      applyState(updateActiveTabContent(stateRef.current, content, assets));
    },
    [applyState],
  );

  const openFile = useCallback(
    (path: string, content: string, assets?: AssetIndex) => {
      const next = openFileTab(stateRef.current, {
        path,
        content,
        assets,
        createId: genId,
        snapshot: contentSnapshotRef.current?.(),
      });
      applyState(next);
      return next.activeTabId;
    },
    [applyState],
  );

  const markSaved = useCallback(
    (path: string, assets?: AssetIndex) => {
      applyState(markActiveTabSaved(stateRef.current, path, assets));
    },
    [applyState],
  );

  const renamePath = useCallback(
    (oldPath: string, newPath: string) => {
      applyState(renameTabsPath(stateRef.current, oldPath, newPath));
    },
    [applyState],
  );

  const renamePathPrefix = useCallback(
    (oldPath: string, newPath: string) => {
      applyState(renameTabsPathPrefix(stateRef.current, oldPath, newPath));
    },
    [applyState],
  );

  const setAssets = useCallback(
    (assets?: AssetIndex) => {
      applyState(setActiveTabAssets(stateRef.current, assets));
    },
    [applyState],
  );

  return {
    tabs,
    activeTab,
    activeTabId,
    newTab,
    closeTab,
    closePath,
    closePathPrefix,
    switchTab,
    updateContent,
    openFile,
    markSaved,
    renamePath,
    renamePathPrefix,
    setAssets,
    setContentSnapshot,
  };
}
