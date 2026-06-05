export function getDocumentTitle(path: string | null | undefined): string {
  if (!path) return "未命名";
  return getPathBasename(path) || "WNote";
}

export function getSaveDefaultName(path: string | null | undefined): string {
  if (!path) return "untitled.md";
  return getPathBasename(path) || "untitled.md";
}

export function shouldApplyOpenedDocument(openedTabId: string, activeTabId: string): boolean {
  return openedTabId === activeTabId;
}

function getPathBasename(path: string): string {
  return path.split(/[/\\]/).pop() ?? "";
}
