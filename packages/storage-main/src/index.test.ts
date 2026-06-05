import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
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
