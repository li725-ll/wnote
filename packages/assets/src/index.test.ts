import { describe, expect, it } from "vitest";
import {
  buildAssetIndex,
  defaultAssetDirectory,
  deleteAssetReference,
  replaceAssetReference,
  resolveAssetPreviewSrc,
} from "./index";

describe("assets", () => {
  it("extracts local markdown images and resolves relative paths", () => {
    const index = buildAssetIndex("![Alt](note.assets/a.png)", {
      documentPath: "/docs/note.md",
      exists: (path) => path === "/docs/note.assets/a.png",
    });

    expect(index.references[0]).toMatchObject({
      src: "note.assets/a.png",
      kind: "local",
      absolutePath: "/docs/note.assets/a.png",
      status: "ok",
    });
    expect(index.missing).toHaveLength(0);
  });

  it("detects missing local images", () => {
    const index = buildAssetIndex("![Missing](<missing image.png>)", {
      documentPath: "/docs/note.md",
      exists: () => false,
    });

    expect(index.references[0]?.absolutePath).toBe("/docs/missing image.png");
    expect(index.references[0]?.status).toBe("missing");
    expect(index.missing).toHaveLength(1);
  });

  it("marks local images unknown without an existence checker", () => {
    const index = buildAssetIndex("![Local](a.png)", { documentPath: "/docs/note.md" });

    expect(index.references[0]?.status).toBe("unknown");
    expect(index.missing).toHaveLength(0);
  });

  it("keeps remote and data images external", () => {
    const index = buildAssetIndex(
      "![Remote](https://example.com/a.png)\n![Data](data:image/png;base64,abc)",
    );

    expect(index.references.map((reference) => reference.status)).toEqual(["external", "external"]);
    expect(index.references.map((reference) => reference.kind)).toEqual(["remote", "data"]);
  });

  it("extracts html images", () => {
    const index = buildAssetIndex('<img src="assets/a.png" alt="A">', {
      documentPath: "/docs/note.md",
      exists: (path) => path === "/docs/assets/a.png",
    });

    expect(index.references[0]).toMatchObject({
      src: "assets/a.png",
      absolutePath: "/docs/assets/a.png",
      status: "ok",
    });
  });

  it("extracts figure html images without losing their source position", () => {
    const markdown =
      'before\n<figure data-wnote-image="true"><img src="note.assets/a.png" alt="A"><figcaption>A</figcaption></figure>\nafter';
    const index = buildAssetIndex(markdown, {
      documentPath: "/docs/note.md",
      exists: (path) => path === "/docs/note.assets/a.png",
    });

    expect(index.references[0]).toMatchObject({
      src: "note.assets/a.png",
      absolutePath: "/docs/note.assets/a.png",
      status: "ok",
      position: markdown.indexOf("<img"),
    });
  });

  it("builds Typora-style asset directory names", () => {
    expect(defaultAssetDirectory("/docs/My Note.md")).toBe("/docs/My Note.assets");
  });

  it("resolves preview urls only for local assets", () => {
    expect(resolveAssetPreviewSrc("a.png", "/docs/note.md")).toBe("wnote-asset:///docs/a.png");
    expect(resolveAssetPreviewSrc("https://example.com/a.png", "/docs/note.md")).toBe(
      "https://example.com/a.png",
    );
  });

  it("deletes a standalone markdown image reference", () => {
    const markdown = "before\n![Missing](old.png)\nafter";
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(deleteAssetReference(markdown, reference)).toBe("before\nafter");
  });

  it("deletes only the image when it is inline with other text", () => {
    const markdown = "before ![Missing](old.png) after";
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(deleteAssetReference(markdown, reference)).toBe("before  after");
  });

  it("deletes an enclosing figure for figure image references", () => {
    const markdown =
      'before\n<figure data-wnote-image="true"><img src="old.png" alt="A"><figcaption>A</figcaption></figure>\nafter';
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(deleteAssetReference(markdown, reference)).toBe("before\nafter");
  });

  it("replaces markdown image targets and preserves title", () => {
    const markdown = '![Alt](old.png "Title")';
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(replaceAssetReference(markdown, reference, "new.png")).toBe('![Alt](new.png "Title")');
  });

  it("wraps replacement markdown targets with spaces", () => {
    const markdown = "![Alt](old.png)";
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(replaceAssetReference(markdown, reference, "new image.png")).toBe(
      "![Alt](<new image.png>)",
    );
  });

  it("replaces html image targets", () => {
    const markdown = '<p><img alt="A" src="old.png"></p>';
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(replaceAssetReference(markdown, reference, "new.png")).toBe(
      '<p><img alt="A" src="new.png"></p>',
    );
  });

  it("replaces figure image targets without changing figure metadata", () => {
    const markdown =
      '<figure data-wnote-image="true" data-align="right"><img src="old.png" alt="A" width="320px"><figcaption>A</figcaption></figure>';
    const reference = buildAssetIndex(markdown).references[0]!;

    expect(replaceAssetReference(markdown, reference, "new image.png")).toBe(
      '<figure data-wnote-image="true" data-align="right"><img src="new image.png" alt="A" width="320px"><figcaption>A</figcaption></figure>',
    );
  });

  it("uses position to replace duplicate image targets", () => {
    const markdown = "![A](same.png)\n![B](same.png)";
    const references = buildAssetIndex(markdown).references;

    expect(replaceAssetReference(markdown, references[1]!, "next.png")).toBe(
      "![A](same.png)\n![B](next.png)",
    );
  });

  it("uses position to replace duplicate html image targets", () => {
    const markdown = '<img src="same.png" alt="A">\n<img src="same.png" alt="B">';
    const references = buildAssetIndex(markdown).references;

    expect(replaceAssetReference(markdown, references[1]!, "next.png")).toBe(
      '<img src="same.png" alt="A">\n<img src="next.png" alt="B">',
    );
  });

  it("keeps mixed markdown and figure references independently addressable", () => {
    const markdown = [
      "![A](note.assets/a.png)",
      '<figure data-wnote-image="true" data-align="center"><img src="note.assets/a.png" alt="A" width="50%"><figcaption>A</figcaption></figure>',
    ].join("\n");
    const references = buildAssetIndex(markdown, {
      documentPath: "/docs/note.md",
      exists: (path) => path === "/docs/note.assets/a.png",
    }).references;

    expect(references).toHaveLength(2);
    expect(references.map((reference) => reference.position)).toEqual([
      0,
      markdown.indexOf("<img"),
    ]);
    expect(replaceAssetReference(markdown, references[1]!, "note.assets/b.png")).toBe(
      '![A](note.assets/a.png)\n<figure data-wnote-image="true" data-align="center"><img src="note.assets/b.png" alt="A" width="50%"><figcaption>A</figcaption></figure>',
    );
    expect(deleteAssetReference(markdown, references[0]!)).toBe(
      '<figure data-wnote-image="true" data-align="center"><img src="note.assets/a.png" alt="A" width="50%"><figcaption>A</figcaption></figure>',
    );
  });

  it("detects unused assets from scanned files", () => {
    const index = buildAssetIndex("![A](note.assets/a.png)", {
      documentPath: "/docs/note.md",
      availableAssets: [
        asset("/docs/note.assets/a.png", "note.assets/a.png"),
        asset("/docs/note.assets/b.png", "note.assets/b.png"),
      ],
    });

    expect(index.unused.map((item) => item.markdownPath)).toEqual(["note.assets/b.png"]);
  });

  it("matches unused assets with Chinese and space paths", () => {
    const index = buildAssetIndex("![图](<note.assets/中文 图片.png>)", {
      documentPath: "/docs/note.md",
      availableAssets: [
        asset("/docs/note.assets/中文 图片.png", "note.assets/中文 图片.png"),
        asset("/docs/note.assets/未使用.png", "note.assets/未使用.png"),
      ],
    });

    expect(index.unused.map((item) => item.markdownPath)).toEqual(["note.assets/未使用.png"]);
  });

  it("does not match assets by filename alone", () => {
    const index = buildAssetIndex("![A](note.assets/a.png)", {
      documentPath: "/docs/note.md",
      availableAssets: [
        asset("/docs/note.assets/a.png", "note.assets/a.png"),
        asset("/docs/other.assets/a.png", "other.assets/a.png"),
      ],
    });

    expect(index.unused.map((item) => item.absolutePath)).toEqual(["/docs/other.assets/a.png"]);
  });

  it("does not use remote references to mark local files as referenced", () => {
    const index = buildAssetIndex("![Remote](https://example.com/a.png)", {
      documentPath: "/docs/note.md",
      availableAssets: [asset("/docs/note.assets/a.png", "note.assets/a.png")],
    });

    expect(index.unused.map((item) => item.markdownPath)).toEqual(["note.assets/a.png"]);
  });
});

function asset(absolutePath: string, markdownPath: string) {
  return {
    id: absolutePath,
    absolutePath,
    markdownPath,
    url: `wnote-asset://${absolutePath}`,
    ext: "png",
    size: 10,
    createdAt: 1,
  };
}
