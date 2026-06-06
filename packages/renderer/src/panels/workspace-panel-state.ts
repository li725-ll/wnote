import type { WorkspaceTreeNode } from "@wnote/contracts";

export function flattenWorkspaceTree(nodes: WorkspaceTreeNode[]): WorkspaceTreeNode[] {
  const flattened: WorkspaceTreeNode[] = [];
  for (const node of nodes) {
    flattened.push(node);
    if (node.type === "directory") flattened.push(...flattenWorkspaceTree(node.children ?? []));
  }
  return flattened;
}

export function hasWorkspaceDocuments(nodes: WorkspaceTreeNode[]): boolean {
  return flattenWorkspaceTree(nodes).some((node) => node.type === "file");
}
