import { describe, expect, it } from "vitest";
import {
  getDocumentTitle,
  getSaveDefaultName,
  isDocumentDirty,
  normalizeDocumentContent,
  shouldApplyOpenedDocument,
} from "./file-state";

describe("file state", () => {
  it("derives document window titles", () => {
    expect(getDocumentTitle("/Users/lmx/docs/note.md")).toBe("note.md");
    expect(getDocumentTitle("C:\\docs\\note.md")).toBe("note.md");
    expect(getDocumentTitle(null)).toBe("未命名");
    expect(getDocumentTitle(undefined)).toBe("未命名");
    expect(getDocumentTitle("/")).toBe("WNote");
  });

  it("derives save default names", () => {
    expect(getSaveDefaultName("/Users/lmx/docs/note.md")).toBe("note.md");
    expect(getSaveDefaultName("C:\\docs\\note.md")).toBe("note.md");
    expect(getSaveDefaultName(null)).toBe("untitled.md");
    expect(getSaveDefaultName(undefined)).toBe("untitled.md");
  });

  it("applies opened content only when the opened tab is still active", () => {
    expect(shouldApplyOpenedDocument("tab-a", "tab-a")).toBe(true);
    expect(shouldApplyOpenedDocument("tab-a", "tab-b")).toBe(false);
  });

  it("normalizes content before dirty comparison", () => {
    expect(normalizeDocumentContent("A  \r\nB\n\n")).toBe("A\nB");
    expect(isDocumentDirty("A  \nB\n", "A\nB")).toBe(false);
    expect(isDocumentDirty("A\nC", "A\nB")).toBe(true);
  });
});
