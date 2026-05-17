import { useState, useCallback, useRef } from "react";

export interface DocumentTab {
  id: string;
  path: string | null;
  content: string;
  dirty: boolean;
}

let tabCounter = 0;
function genId(): string {
  return `tab-${Date.now()}-${++tabCounter}`;
}

function createEmptyTab(): DocumentTab {
  return { id: genId(), path: null, content: "", dirty: false };
}

export function useTabs() {
  const [tabs, setTabs] = useState<DocumentTab[]>(() => [createEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? "");
  const contentSnapshotRef = useRef<(() => string) | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const setContentSnapshot = useCallback((fn: () => string) => {
    contentSnapshotRef.current = fn;
  }, []);

  const snapshotCurrent = useCallback(() => {
    const content = contentSnapshotRef.current?.();
    if (content === undefined) return;
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, content: content! } : t)));
  }, [activeTabId]);

  const newTab = useCallback(() => {
    snapshotCurrent();
    const tab = createEmptyTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    return tab.id;
  }, [snapshotCurrent]);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          const fresh = createEmptyTab();
          setActiveTabId(fresh.id);
          return [fresh];
        }
        if (id === activeTabId) {
          const idx = prev.findIndex((t) => t.id === id);
          const next = remaining[Math.min(idx, remaining.length - 1)];
          setActiveTabId(next.id);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const switchTab = useCallback(
    (id: string) => {
      if (id === activeTabId) return;
      snapshotCurrent();
      setActiveTabId(id);
    },
    [activeTabId, snapshotCurrent],
  );

  const updateContent = useCallback(
    (content: string) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content, dirty: true } : t)),
      );
    },
    [activeTabId],
  );

  const openFile = useCallback(
    (path: string, content: string) => {
      snapshotCurrent();
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        setTabs((prev) => prev.map((t) => (t.id === existing.id ? { ...t, content } : t)));
        return existing.id;
      }
      if (tabs.length === 1 && !activeTab.path && !activeTab.dirty && activeTab.content === "") {
        const id = activeTab.id;
        setTabs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, path, content, dirty: false } : t)),
        );
        return id;
      }
      const tab: DocumentTab = { id: genId(), path, content, dirty: false };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      return tab.id;
    },
    [tabs, activeTab, snapshotCurrent],
  );

  const markSaved = useCallback(
    (path: string) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, path, dirty: false } : t)));
    },
    [activeTabId],
  );

  return {
    tabs,
    activeTab,
    activeTabId,
    newTab,
    closeTab,
    switchTab,
    updateContent,
    openFile,
    markSaved,
    setContentSnapshot,
  };
}
