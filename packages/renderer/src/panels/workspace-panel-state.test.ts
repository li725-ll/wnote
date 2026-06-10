import { describe, expect, it } from "vitest";
import type { WorkspaceTreeNode } from "@wnote/contracts";
import {
  flattenWorkspaceTree,
  filterWorkspaceTree,
  hasWorkspaceDocuments,
  hasWorkspaceEntries,
} from "./workspace-panel-state";

const tree: WorkspaceTreeNode[] = [
  {
    name: "notes",
    path: "/workspace/notes",
    type: "directory",
    children: [
      {
        name: "daily.md",
        path: "/workspace/notes/daily.md",
        type: "file",
      },
    ],
  },
  {
    name: "readme.md",
    path: "/workspace/readme.md",
    type: "file",
  },
];

describe("workspace panel state", () => {
  it("flattens nested workspace trees in display order", () => {
    expect(flattenWorkspaceTree(tree).map((node) => node.path)).toEqual([
      "/workspace/notes",
      "/workspace/notes/daily.md",
      "/workspace/readme.md",
    ]);
  });

  it("detects whether a tree contains documents", () => {
    expect(hasWorkspaceDocuments(tree)).toBe(true);
    expect(hasWorkspaceDocuments([{ name: "empty", path: "/empty", type: "directory" }])).toBe(
      false,
    );
  });

  it("detects empty directory entries separately from documents", () => {
    expect(hasWorkspaceEntries([{ name: "empty", path: "/empty", type: "directory" }])).toBe(true);
    expect(hasWorkspaceEntries([])).toBe(false);
  });

  it("filters workspace trees while preserving matching parents", () => {
    expect(filterWorkspaceTree(tree, "daily")).toEqual([
      {
        name: "notes",
        path: "/workspace/notes",
        type: "directory",
        children: [
          {
            name: "daily.md",
            path: "/workspace/notes/daily.md",
            type: "file",
            children: undefined,
          },
        ],
      },
    ]);
  });
});
