import { describe, expect, it } from "vitest";
import type { AssetIndex, AssetReference } from "@wnote/contracts";
import {
  buildDocumentAssetIndex,
  canRelocateDocumentAsset,
  getAssetRelocateBlockedMessage,
  getUnusedAssetDeleteAllConfirmMessage,
  getUnusedAssetDeleteConfirmMessage,
  getUnusedAssetDeleteFailureMessage,
  relocateDocumentAssetReference,
  removeDocumentAssetReference,
  resolveDocumentAssetPath,
  resolveDocumentAssetPreview,
} from "./asset-state";

describe("asset state", () => {
  it("builds an asset index for the active document path", () => {
    const index = buildDocumentAssetIndex("![A](assets/a.png)", "/docs/note.md");

    expect(index.documentPath).toBe("/docs/note.md");
    expect(index.references[0]).toMatchObject({
      src: "assets/a.png",
      absolutePath: "/docs/assets/a.png",
    });
  });

  it("resolves previews unless the active asset index marks the source missing", () => {
    const missing = reference("assets/missing.png", "missing");
    const assets: AssetIndex = {
      references: [missing],
      missing: [missing],
      unused: [],
    };

    expect(resolveDocumentAssetPreview("assets/missing.png", assets, "/docs/note.md")).toBeNull();
    expect(resolveDocumentAssetPreview("assets/a.png", assets, "/docs/note.md")).toBe(
      "wnote-asset:///docs/assets/a.png",
    );
    expect(resolveDocumentAssetPreview("https://example.com/a.png", assets, "/docs/note.md")).toBe(
      "https://example.com/a.png",
    );
  });

  it("resolves absolute paths from the active asset index", () => {
    const local = reference("assets/a.png", "ok");
    local.absolutePath = "/docs/assets/a.png";
    const assets: AssetIndex = {
      references: [local],
      missing: [],
      unused: [
        {
          id: "/docs/note.assets/unused.png",
          absolutePath: "/docs/note.assets/unused.png",
          markdownPath: "note.assets/unused.png",
          url: "wnote-asset:///docs/note.assets/unused.png",
          ext: "png",
          size: 1,
          createdAt: 1,
        },
      ],
    };

    expect(resolveDocumentAssetPath("assets/a.png", assets)).toBe("/docs/assets/a.png");
    expect(resolveDocumentAssetPath("note.assets/unused.png", assets)).toBe(
      "/docs/note.assets/unused.png",
    );
    expect(resolveDocumentAssetPath("https://example.com/a.png", assets)).toBe(
      "https://example.com/a.png",
    );
  });

  it("removes document asset references and returns null when nothing changes", () => {
    const content = "before\n![A](old.png)\nafter";
    const target = buildDocumentAssetIndex(content, null).references[0]!;
    const stale = reference("missing.png", "unknown");

    expect(removeDocumentAssetReference(content, target)).toBe("before\nafter");
    expect(removeDocumentAssetReference(content, stale)).toBeNull();
  });

  it("relocates document asset references and returns null when nothing changes", () => {
    const content = "![A](old.png)";
    const target = buildDocumentAssetIndex(content, null).references[0]!;
    const stale = reference("missing.png", "unknown");

    expect(relocateDocumentAssetReference(content, target, "new.png")).toBe("![A](new.png)");
    expect(relocateDocumentAssetReference(content, stale, "new.png")).toBeNull();
  });

  it("describes resource action guards and confirmation messages", () => {
    expect(canRelocateDocumentAsset("/docs/note.md")).toBe(true);
    expect(canRelocateDocumentAsset(null)).toBe(false);
    expect(getAssetRelocateBlockedMessage()).toBe("请先保存当前文档，再重新定位图片。");
    expect(getUnusedAssetDeleteConfirmMessage("note.assets/a.png")).toBe(
      "删除未引用资源？\nnote.assets/a.png",
    );
    expect(getUnusedAssetDeleteAllConfirmMessage(3)).toBe(
      "清理 3 个未引用资源？此操作会删除文件。",
    );
    expect(getUnusedAssetDeleteFailureMessage(2, 1)).toBe("已删除 2 个资源，1 个删除失败。");
  });
});

function reference(src: string, status: AssetReference["status"]): AssetReference {
  return {
    src,
    kind: "local",
    position: 0,
    status,
    absolutePath: `/docs/${src}`,
    previewSrc: `wnote-asset:///docs/${src}`,
  };
}
