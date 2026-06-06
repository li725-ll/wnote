import type { AssetIndex } from "@wnote/contracts";

export interface DocumentTab {
  id: string;
  path: string | null;
  content: string;
  dirty: boolean;
  assets?: AssetIndex;
}

export interface TabsState {
  tabs: DocumentTab[];
  activeTabId: string;
}

export type TabIdFactory = () => string;

export function createEmptyTab(createId: TabIdFactory): DocumentTab {
  return { id: createId(), path: null, content: "", dirty: false };
}

export function createInitialTabsState(createId: TabIdFactory): TabsState {
  const tab = createEmptyTab(createId);
  return { tabs: [tab], activeTabId: tab.id };
}

export function activeTab(state: TabsState): DocumentTab {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0]!;
}

export function snapshotActiveTab(state: TabsState, content: string | undefined): TabsState {
  if (content === undefined) return state;
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, content } : tab)),
  };
}

export function createNewTab(
  state: TabsState,
  createId: TabIdFactory,
  snapshot?: string,
): TabsState {
  const current = snapshotActiveTab(state, snapshot);
  const tab = createEmptyTab(createId);
  return {
    tabs: [...current.tabs, tab],
    activeTabId: tab.id,
  };
}

export function closeTab(state: TabsState, id: string, createId: TabIdFactory): TabsState {
  const remaining = state.tabs.filter((tab) => tab.id !== id);
  if (remaining.length === 0) {
    const fresh = createEmptyTab(createId);
    return { tabs: [fresh], activeTabId: fresh.id };
  }
  if (id !== state.activeTabId) return { ...state, tabs: remaining };

  const index = state.tabs.findIndex((tab) => tab.id === id);
  const next = remaining[Math.min(index, remaining.length - 1)]!;
  return { tabs: remaining, activeTabId: next.id };
}

export function closeTabsByPath(state: TabsState, path: string, createId: TabIdFactory): TabsState {
  const matching = state.tabs.filter((tab) => tab.path === path);
  return matching.reduce((current, tab) => closeTab(current, tab.id, createId), state);
}

export function switchTab(state: TabsState, id: string, snapshot?: string): TabsState {
  if (id === state.activeTabId || !state.tabs.some((tab) => tab.id === id)) return state;
  return {
    ...snapshotActiveTab(state, snapshot),
    activeTabId: id,
  };
}

export function renameTabsPath(state: TabsState, oldPath: string, newPath: string): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.path === oldPath ? { ...tab, path: newPath } : tab)),
  };
}

export function updateActiveTabContent(
  state: TabsState,
  content: string,
  assets?: AssetIndex,
): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.id === state.activeTabId ? { ...tab, content, assets, dirty: true } : tab,
    ),
  };
}

export function openFileTab(
  state: TabsState,
  {
    path,
    content,
    assets,
    createId,
    snapshot,
  }: {
    path: string;
    content: string;
    assets?: AssetIndex;
    createId: TabIdFactory;
    snapshot?: string;
  },
): TabsState {
  const current = snapshotActiveTab(state, snapshot);
  const existing = current.tabs.find((tab) => tab.path === path);
  if (existing) {
    return {
      tabs: current.tabs.map((tab) =>
        tab.id === existing.id ? { ...tab, content, assets, dirty: false } : tab,
      ),
      activeTabId: existing.id,
    };
  }

  const currentActive = activeTab(current);
  if (
    current.tabs.length === 1 &&
    !currentActive.path &&
    !currentActive.dirty &&
    currentActive.content === ""
  ) {
    return {
      tabs: current.tabs.map((tab) =>
        tab.id === currentActive.id ? { ...tab, path, content, assets, dirty: false } : tab,
      ),
      activeTabId: currentActive.id,
    };
  }

  const tab: DocumentTab = { id: createId(), path, content, assets, dirty: false };
  return { tabs: [...current.tabs, tab], activeTabId: tab.id };
}

export function markActiveTabSaved(state: TabsState, path: string, assets?: AssetIndex): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.id === state.activeTabId ? { ...tab, path, assets, dirty: false } : tab,
    ),
  };
}

export function setActiveTabAssets(state: TabsState, assets?: AssetIndex): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, assets } : tab)),
  };
}
