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

export function hasWorkspaceEntries(nodes: WorkspaceTreeNode[]): boolean {
  return nodes.length > 0;
}

export function filterWorkspaceTree(
  nodes: WorkspaceTreeNode[],
  query: string,
): WorkspaceTreeNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return nodes;
  return nodes.flatMap((node) => {
    const children =
      node.type === "directory" ? filterWorkspaceTree(node.children ?? [], query) : [];
    if (node.name.toLowerCase().includes(normalized) || children.length > 0) {
      return [{ ...node, children: node.type === "directory" ? children : undefined }];
    }
    return [];
  });
}
