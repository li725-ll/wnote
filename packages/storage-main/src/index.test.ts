import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  createWorkspaceDirectory,
  createWorkspaceFile,
  deleteWorkspaceEntry,
  deleteAsset,
  importAsset,
  readWorkspace,
  renameWorkspaceEntry,
  saveAsset,
} from ".";
import {
  exportHtmlDocument,
  renderExportHtml,
  rewriteLocalImageSources,
  wrapHtmlDocument,
} from "./export-html";

describe("@wnote/storage-main export", () => {
  it("wraps exported html with document shell", () => {
    const html = wrapHtmlDocument("<h1>Title</h1>", "Doc & Notes");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Doc &amp; Notes</title>");
    expect(html).toContain("<h1>Title</h1>");
  });

  it("rewrites local image sources relative to export path", async () => {
    const html = await rewriteLocalImageSources(
      '<p><img src="note.assets/image.png" alt="A"></p>',
      {
        documentPath: "/Users/me/docs/note.md",
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain('src="../docs/note.assets/image.png"');
  });

  it("keeps remote and data image sources unchanged", async () => {
    const html = await rewriteLocalImageSources(
      '<img src="https://example.com/a.png"><img src="data:image/png;base64,abc">',
      {
        documentPath: "/Users/me/docs/note.md",
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('src="data:image/png;base64,abc"');
  });

  it("renders math placeholders into katex html", async () => {
    const html = await renderExportHtml(
      '<p><span data-math-inline="x^2">x^2</span></p><div data-math-block="\\sum_i x_i">\\sum_i x_i</div>',
      {
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain("katex");
    expect(html).not.toContain("data-math-inline");
    expect(html).not.toContain("data-math-block");
  });

  it("falls back when math rendering fails", async () => {
    const html = await renderExportHtml(
      '<p><span data-math-inline="bad">bad</span></p><div data-math-block="bad block">bad block</div>',
      {
        exportPath: "/Users/me/exports/note.html",
        renderers: {
          katex: {
            renderInlineMath: () => {
              throw new Error("inline failed");
            },
            renderBlockMath: () => {
              throw new Error("block failed");
            },
          },
        },
      },
    );

    expect(html).toContain('<code class="katex-error">bad</code>');
    expect(html).toContain('<pre class="katex-error"><code>bad block</code></pre>');
  });

  it("renders code blocks with shiki html", async () => {
    const html = await renderExportHtml(
      '<pre><code class="language-js">const value = 1;</code></pre>',
      {
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain('class="shiki');
    expect(html).toContain("const");
  });

  it("falls back to plain code when highlighting fails", async () => {
    const html = await renderExportHtml(
      '<pre><code class="language-js">const value = 1 &amp;&amp; 2;</code></pre>',
      {
        exportPath: "/Users/me/exports/note.html",
        renderers: {
          highlight: async () => {
            throw new Error("highlight failed");
          },
        },
      },
    );

    expect(html).toContain(
      '<pre><code class="language-javascript">const value = 1 &amp;&amp; 2;</code></pre>',
    );
    expect(html).not.toContain('class="shiki');
  });

  it("falls back to plain code when no highlighter is available", async () => {
    const html = await renderExportHtml(
      '<pre><code class="language-js">const value = 1;</code></pre>',
      {
        exportPath: "/Users/me/exports/note.html",
        renderers: { highlight: undefined },
      },
    );

    expect(html).toContain('<pre><code class="language-javascript">const value = 1;</code></pre>');
  });

  it("turns mermaid placeholders into browser-rendered mermaid blocks", async () => {
    const html = await renderExportHtml(
      '<div data-mermaid-block="graph TD&#xA;  A --&gt; B">graph TD\n  A --&gt; B</div>',
      {
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain('class="mermaid"');
    expect(html).toContain("graph TD");
    expect(html).not.toContain("data-mermaid-block");
  });

  it("falls back to fenced mermaid code when mermaid rendering is disabled", async () => {
    const html = await renderExportHtml(
      '<div data-mermaid-block="graph TD&#xA;  A --&gt; B">graph TD\n  A --&gt; B</div>',
      {
        exportPath: "/Users/me/exports/note.html",
        renderMermaid: false,
      },
    );

    expect(html).toContain('<pre><code class="language-mermaid">graph TD');
    expect(html).toContain("A --&gt; B");
  });

  it("preserves exported figure image metadata", async () => {
    const html = await renderExportHtml(
      '<figure data-wnote-image="true" data-align="right"><img src="note.assets/image.png" alt="Alt" width="320px"><figcaption>Caption</figcaption></figure>',
      {
        documentPath: "/Users/me/docs/note.md",
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain('<figure data-wnote-image="true" data-align="right">');
    expect(html).toContain('src="../docs/note.assets/image.png"');
    expect(html).toContain('width="320px"');
    expect(html).toContain("<figcaption>Caption</figcaption>");
  });

  it("can omit mermaid browser script from the html shell", () => {
    const html = wrapHtmlDocument('<div class="mermaid">graph TD</div>', "Doc", {
      renderMermaid: false,
    });

    expect(html).not.toContain("mermaid.esm.min.mjs");
  });

  it("can wrap exported html with dark theme styles", () => {
    const html = wrapHtmlDocument("<h1>Dark</h1>", "Doc", { theme: "dark" });

    expect(html).toContain(":root { color-scheme: dark; }");
    expect(html).toContain("background: #0d1117;");
    expect(html).toContain('theme: "dark"');
  });

  it("includes pdf page settings in the exported html shell", () => {
    const html = wrapHtmlDocument("<h1>PDF</h1>", "Doc", {
      pdf: {
        pageSize: "Letter",
        orientation: "landscape",
        margin: "wide",
        printBackground: true,
      },
    });

    expect(html).toContain("@page { size: Letter landscape; margin: 28mm; }");
    expect(html).toContain("break-inside: avoid");
  });

  it("falls back to plain code for unsupported highlight languages", async () => {
    const html = await renderExportHtml(
      '<pre><code class="language-unknownlang">value &amp; more</code></pre>',
      {
        exportPath: "/Users/me/exports/note.html",
      },
    );

    expect(html).toContain("<pre><code>value &amp; more</code></pre>");
    expect(html).not.toContain('class="shiki');
  });

  it("can inline local images as data urls", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-export-"));
    const imagePath = join(dir, "note.assets", "image.png");
    await mkdir(join(dir, "note.assets"));
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const html = await rewriteLocalImageSources('<img src="note.assets/image.png">', {
      documentPath: join(dir, "note.md"),
      exportPath: join(dir, "out", "note.html"),
      inlineLocalImages: true,
    });

    expect(html).toContain('src="data:image/png;base64,iVBORw=="');
  });

  it("uses request export options when writing html documents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-export-options-"));
    await mkdir(join(dir, "note.assets"));
    await writeFile(join(dir, "note.assets", "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const exportPath = join(dir, "out.html");

    await exportHtmlDocument({
      filePath: exportPath,
      documentPath: join(dir, "note.md"),
      defaultName: "note.html",
      content: "![A](note.assets/image.png)\n\n```mermaid\ngraph TD\n  A --> B\n```",
      options: {
        inlineLocalImages: true,
        renderMermaid: false,
        theme: "dark",
      },
    });
    const html = await readFile(exportPath, "utf-8");

    expect(html).toContain('src="data:image/png;base64,iVBORw=="');
    expect(html).not.toContain("mermaid.esm.min.mjs");
    expect(html).toContain(":root { color-scheme: dark; }");
  });
});

describe("@wnote/storage-main assets", () => {
  it("saves pasted images beside saved documents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-asset-save-"));
    const documentPath = join(dir, "note.md");

    const asset = await saveAsset(
      {
        buffer: new Uint8Array([1, 2, 3]).buffer,
        ext: "png",
        documentPath,
        originalName: "pasted.png",
        mime: "image/png",
      },
      { dataDirectory: join(dir, "data") },
    );

    expect(asset.markdownPath).toMatch(/^note\.assets[/\\].+\.png$/);
    expect(asset.url).toContain("wnote-asset://");
    expect(asset.size).toBe(3);
    await expect(stat(asset.absolutePath)).resolves.toMatchObject({ size: 3 });
  });

  it("imports external images into the document asset directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-asset-import-"));
    const sourcePath = join(dir, "source.jpg");
    const documentPath = join(dir, "note.md");
    await writeFile(sourcePath, Buffer.from([4, 5, 6, 7]));

    const asset = await importAsset({ sourcePath, documentPath });

    expect(asset.originalName).toBe("source.jpg");
    expect(asset.markdownPath).toMatch(/^note\.assets[/\\].+\.jpg$/);
    expect(asset.mime).toBe("image/jpeg");
    await expect(readFile(asset.absolutePath)).resolves.toEqual(Buffer.from([4, 5, 6, 7]));
  });

  it("rejects deleting files outside the document asset directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-asset-delete-"));
    const documentPath = join(dir, "note.md");
    const outsidePath = join(dir, "outside.png");
    await writeFile(outsidePath, Buffer.from([1]));

    await expect(
      deleteAsset({
        documentPath,
        absolutePath: outsidePath,
        content: "",
      }),
    ).rejects.toThrow("outside the document assets directory");
  });
});

describe("@wnote/storage-main workspace", () => {
  it("scans supported documents in a stable directory-first order", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-"));
    await mkdir(join(dir, "notes"));
    await mkdir(join(dir, "node_modules"));
    await mkdir(join(dir, ".hidden"));
    await writeFile(join(dir, "b.txt"), "b");
    await writeFile(join(dir, "a.md"), "a");
    await writeFile(join(dir, "ignore.png"), "png");
    await writeFile(join(dir, "notes", "daily.markdown"), "daily");
    await writeFile(join(dir, "node_modules", "package.md"), "ignored");
    await writeFile(join(dir, ".hidden", "secret.md"), "ignored");

    const workspace = await readWorkspace(dir);

    expect(workspace.rootPath).toBe(dir);
    expect(workspace.tree.map((node) => `${node.type}:${node.name}`)).toEqual([
      "directory:notes",
      "file:a.md",
      "file:b.txt",
    ]);
    expect(workspace.tree[0]?.children?.map((node) => node.name)).toEqual(["daily.markdown"]);
  });

  it("rejects non-directory workspace paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-file-"));
    const filePath = join(dir, "note.md");
    await writeFile(filePath, "note");

    await expect(readWorkspace(filePath)).rejects.toThrow("Workspace path is not a directory");
  });

  it("creates markdown files and returns the opened document", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-create-file-"));

    const result = await createWorkspaceFile({
      rootPath: dir,
      name: "new note",
      content: "# New Note",
    });

    expect(result.document.name).toBe("new note.md");
    expect(result.document.content).toBe("# New Note");
    expect(result.workspace.tree.map((node) => node.name)).toEqual(["new note.md"]);
    await expect(readFile(join(dir, "new note.md"), "utf-8")).resolves.toBe("# New Note");
  });

  it("creates workspace directories inside the selected root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-create-dir-"));

    const directoryResult = await createWorkspaceDirectory({
      rootPath: dir,
      name: "notes",
    });
    const result = await createWorkspaceFile({
      rootPath: dir,
      parentPath: join(dir, "notes"),
      name: "daily.md",
    });

    expect(directoryResult.tree.map((node) => node.name)).toEqual(["notes"]);
    expect(directoryResult.tree[0]?.children).toEqual([]);
    expect(result.workspace.tree[0]?.name).toBe("notes");
    expect(result.workspace.tree[0]?.children?.map((node) => node.name)).toEqual(["daily.md"]);
  });

  it("creates nested workspace directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-create-nested-dir-"));
    await createWorkspaceDirectory({
      rootPath: dir,
      name: "notes",
    });

    const result = await createWorkspaceDirectory({
      rootPath: dir,
      parentPath: join(dir, "notes"),
      name: "daily",
    });

    expect(result.tree[0]?.name).toBe("notes");
    expect(result.tree[0]?.children?.map((node) => node.name)).toEqual(["daily"]);
    expect(result.tree[0]?.children?.[0]?.children).toEqual([]);
  });

  it("rejects workspace file creation outside the root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-outside-"));
    const outside = await mkdtemp(join(tmpdir(), "wnote-workspace-outside-parent-"));

    await expect(
      createWorkspaceFile({
        rootPath: dir,
        parentPath: outside,
        name: "escape.md",
      }),
    ).rejects.toThrow("outside the workspace");
  });

  it("rejects unsupported workspace document extensions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-extension-"));

    await expect(
      createWorkspaceFile({
        rootPath: dir,
        name: "image.png",
      }),
    ).rejects.toThrow("Unsupported workspace document extension");
  });

  it("renames workspace files and keeps them readable", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-rename-file-"));
    const filePath = join(dir, "old.md");
    await writeFile(filePath, "# Old");

    const result = await renameWorkspaceEntry({
      rootPath: dir,
      targetPath: filePath,
      name: "new",
    });

    expect(result.oldPath).toBe(filePath);
    expect(result.newPath).toBe(join(dir, "new.md"));
    expect(result.nodeType).toBe("file");
    expect(result.workspace.tree.map((node) => node.name)).toEqual(["new.md"]);
    await expect(readFile(join(dir, "new.md"), "utf-8")).resolves.toBe("# Old");
  });

  it("renames workspace directories in place", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-rename-dir-"));
    await mkdir(join(dir, "drafts"));
    await writeFile(join(dir, "drafts", "note.md"), "note");

    const result = await renameWorkspaceEntry({
      rootPath: dir,
      targetPath: join(dir, "drafts"),
      name: "notes",
    });

    expect(result.nodeType).toBe("directory");
    expect(result.newPath).toBe(join(dir, "notes"));
    expect(result.workspace.tree[0]?.name).toBe("notes");
    expect(result.workspace.tree[0]?.children?.[0]?.name).toBe("note.md");
  });

  it("rejects workspace rename conflicts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-rename-conflict-"));
    await writeFile(join(dir, "old.md"), "old");
    await writeFile(join(dir, "new.md"), "new");

    await expect(
      renameWorkspaceEntry({
        rootPath: dir,
        targetPath: join(dir, "old.md"),
        name: "new.md",
      }),
    ).rejects.toThrow("already exists");
  });

  it("deletes workspace files and empty directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-delete-"));
    await writeFile(join(dir, "note.md"), "note");
    await mkdir(join(dir, "empty"));

    const deletedFile = await deleteWorkspaceEntry({
      rootPath: dir,
      targetPath: join(dir, "note.md"),
    });
    const deletedDirectory = await deleteWorkspaceEntry({
      rootPath: dir,
      targetPath: join(dir, "empty"),
    });

    expect(deletedFile.nodeType).toBe("file");
    expect(deletedDirectory.nodeType).toBe("directory");
    expect(deletedDirectory.workspace.tree).toEqual([]);
  });

  it("rejects deleting non-empty workspace directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-workspace-delete-non-empty-"));
    await mkdir(join(dir, "notes"));
    await writeFile(join(dir, "notes", "note.md"), "note");

    await expect(
      deleteWorkspaceEntry({
        rootPath: dir,
        targetPath: join(dir, "notes"),
      }),
    ).rejects.toThrow("Workspace directory is not empty");
  });
});
