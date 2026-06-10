import { useTabsStore } from "../stores/tabs-store";

export type { DocumentTab } from "./tabs-state";

export function useTabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const activeTab = useTabsStore((state) => state.activeTab());
  const newTab = useTabsStore((state) => state.newTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const closePath = useTabsStore((state) => state.closePath);
  const closePathPrefix = useTabsStore((state) => state.closePathPrefix);
  const switchTab = useTabsStore((state) => state.switchTab);
  const updateContent = useTabsStore((state) => state.updateContent);
  const openFile = useTabsStore((state) => state.openFile);
  const markSaved = useTabsStore((state) => state.markSaved);
  const renamePath = useTabsStore((state) => state.renamePath);
  const renamePathPrefix = useTabsStore((state) => state.renamePathPrefix);
  const setAssets = useTabsStore((state) => state.setAssets);
  const setContentSnapshot = useTabsStore((state) => state.setContentSnapshot);

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
