import { describe, expect, it } from "vitest";
import type { AssetIndex } from "@wnote/contracts";
import {
  activeTab,
  closeTab,
  closeTabsByPath,
  closeTabsByPathPrefix,
  createInitialTabsState,
  createNewTab,
  markActiveTabSaved,
  openFileTab,
  renameTabsPath,
  renameTabsPathPrefix,
  setActiveTabAssets,
  switchTab,
  updateActiveTabContent,
} from "./tabs-state";

function ids(...values: string[]) {
  let index = 0;
  return () => values[index++] ?? `tab-${index}`;
}

const assets: AssetIndex = {
  references: [],
  missing: [],
  unused: [],
};

describe("tabs state", () => {
  it("creates an initial empty clean tab", () => {
    const state = createInitialTabsState(ids("a"));

    expect(state.activeTabId).toBe("a");
    expect(state.tabs).toEqual([{ id: "a", path: null, content: "", dirty: false }]);
    expect(activeTab(state).id).toBe("a");
  });

  it("replaces the untouched initial tab when opening a file", () => {
    const state = createInitialTabsState(ids("a"));

    const next = openFileTab(state, {
      path: "/docs/a.md",
      content: "# A",
      assets,
      createId: ids("unused"),
    });

    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabId).toBe("a");
    expect(next.tabs[0]).toMatchObject({
      id: "a",
      path: "/docs/a.md",
      content: "# A",
      assets,
      dirty: false,
    });
  });

  it("appends a file tab and snapshots current content when the active tab has work", () => {
    const state = updateActiveTabContent(createInitialTabsState(ids("a")), "draft");

    const next = openFileTab(state, {
      path: "/docs/a.md",
      content: "# A",
      createId: ids("b"),
      snapshot: "current draft",
    });

    expect(next.activeTabId).toBe("b");
    expect(next.tabs).toEqual([
      { id: "a", path: null, content: "current draft", dirty: true, assets: undefined },
      { id: "b", path: "/docs/a.md", content: "# A", dirty: false, assets: undefined },
    ]);
  });

  it("reuses an already open file tab and refreshes its clean content", () => {
    const createId = ids("a", "b");
    const first = openFileTab(createInitialTabsState(createId), {
      path: "/docs/a.md",
      content: "old",
      createId,
    });
    const second = createNewTab(first, createId);

    const next = openFileTab(second, {
      path: "/docs/a.md",
      content: "new",
      assets,
      createId,
      snapshot: "scratch",
    });

    expect(next.activeTabId).toBe("a");
    expect(next.tabs[0]).toMatchObject({
      id: "a",
      path: "/docs/a.md",
      content: "new",
      assets,
      dirty: false,
    });
    expect(next.tabs[1]).toMatchObject({ id: "b", content: "scratch" });
  });

  it("switches tabs only to known ids and snapshots the previous active tab", () => {
    const createId = ids("a", "b");
    const state = createNewTab(createInitialTabsState(createId), createId);

    const switched = switchTab(state, "a", "scratch");
    const ignored = switchTab(switched, "missing", "ignored");

    expect(switched.activeTabId).toBe("a");
    expect(switched.tabs.find((tab) => tab.id === "b")?.content).toBe("scratch");
    expect(ignored).toBe(switched);
  });

  it("closes tabs while preserving a valid active tab", () => {
    const createId = ids("a", "b", "c", "fresh");
    const withB = createNewTab(createInitialTabsState(createId), createId);
    const withC = createNewTab(withB, createId);

    const closeActive = closeTab(withC, "c", createId);
    const closeInactive = closeTab(closeActive, "a", createId);
    const closeLast = closeTab(closeInactive, "b", createId);

    expect(closeActive.activeTabId).toBe("b");
    expect(closeActive.tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
    expect(closeInactive.activeTabId).toBe("b");
    expect(closeInactive.tabs.map((tab) => tab.id)).toEqual(["b"]);
    expect(closeLast).toEqual({
      tabs: [{ id: "fresh", path: null, content: "", dirty: false }],
      activeTabId: "fresh",
    });
  });

  it("closes tabs by matching file path", () => {
    const createId = ids("a", "b", "fresh");
    const first = openFileTab(createInitialTabsState(createId), {
      path: "/docs/a.md",
      content: "a",
      createId,
    });
    const second = openFileTab(first, {
      path: "/docs/b.md",
      content: "b",
      createId,
    });

    const next = closeTabsByPath(second, "/docs/b.md", createId);

    expect(next.tabs.map((tab) => tab.path)).toEqual(["/docs/a.md"]);
    expect(next.activeTabId).toBe("a");
  });

  it("renames tab paths without changing content state", () => {
    const state = openFileTab(createInitialTabsState(ids("a")), {
      path: "/docs/old.md",
      content: "content",
      createId: ids("unused"),
    });

    const next = renameTabsPath(state, "/docs/old.md", "/docs/new.md");

    expect(next.tabs[0]).toMatchObject({
      path: "/docs/new.md",
      content: "content",
      dirty: false,
    });
  });

  it("renames all tab paths inside a directory", () => {
    const createId = ids("a", "b", "c");
    const first = openFileTab(createInitialTabsState(createId), {
      path: "/docs/drafts/a.md",
      content: "a",
      createId,
    });
    const second = openFileTab(first, {
      path: "/docs/drafts/nested/b.md",
      content: "b",
      createId,
    });
    const third = openFileTab(second, {
      path: "/docs/other.md",
      content: "other",
      createId,
    });

    const next = renameTabsPathPrefix(third, "/docs/drafts", "/docs/archive/drafts");

    expect(next.tabs.map((tab) => tab.path)).toEqual([
      "/docs/archive/drafts/a.md",
      "/docs/archive/drafts/nested/b.md",
      "/docs/other.md",
    ]);
  });

  it("closes all tabs inside a deleted directory", () => {
    const createId = ids("a", "b", "c", "fresh");
    const first = openFileTab(createInitialTabsState(createId), {
      path: "/docs/drafts/a.md",
      content: "a",
      createId,
    });
    const second = openFileTab(first, {
      path: "/docs/drafts/nested/b.md",
      content: "b",
      createId,
    });
    const third = openFileTab(second, {
      path: "/docs/other.md",
      content: "other",
      createId,
    });

    const next = closeTabsByPathPrefix(third, "/docs/drafts", createId);

    expect(next.tabs.map((tab) => tab.path)).toEqual(["/docs/other.md"]);
    expect(next.activeTabId).toBe("c");
  });

  it("updates content, save state, and asset index on the active tab", () => {
    const changed = updateActiveTabContent(createInitialTabsState(ids("a")), "# Draft", assets);
    const saved = markActiveTabSaved(changed, "/docs/draft.md");
    const withoutAssets = setActiveTabAssets(saved, undefined);

    expect(changed.tabs[0]).toMatchObject({ content: "# Draft", assets, dirty: true });
    expect(saved.tabs[0]).toMatchObject({
      path: "/docs/draft.md",
      content: "# Draft",
      assets: undefined,
      dirty: false,
    });
    expect(withoutAssets.tabs[0]?.assets).toBeUndefined();
  });
});
