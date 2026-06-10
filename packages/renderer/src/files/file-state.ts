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

export function normalizeDocumentContent(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trimEnd();
}

export function isDocumentDirty(content: string, savedContent: string): boolean {
  return normalizeDocumentContent(content) !== normalizeDocumentContent(savedContent);
}

function getPathBasename(path: string): string {
  return path.split(/[/\\]/).pop() ?? "";
}
