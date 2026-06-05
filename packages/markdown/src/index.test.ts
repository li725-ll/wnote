import { describe, expect, it } from "vitest";
import { buildAssetIndex } from "../../assets/src/index";
import { htmlToMarkdown, markdownToHtml, parseMarkdown } from "./index";

function roundTrip(markdown: string) {
  return htmlToMarkdown(markdownToHtml(markdown)).trim();
}

describe("@wnote/markdown", () => {
  it("extracts headings while parsing markdown", () => {
    const result = parseMarkdown("# Title\n\n## Child");

    expect(result.headings).toEqual([
      { id: "title", level: 1, text: "Title", from: 0 },
      { id: "child", level: 2, text: "Child", from: 1 },
    ]);
  });

  it("round-trips links and images", () => {
    expect(roundTrip("[OpenAI](https://openai.com)\n\n![Alt](asset://image.png)")).toBe(
      "[OpenAI](https://openai.com)\n![Alt](asset://image.png)",
    );
  });

  it("round-trips mixed inline formatting", () => {
    expect(roundTrip("**Bold** _Em_ ~~Gone~~ `code` [Link](https://example.com)")).toBe(
      "**Bold** *Em* ~~Gone~~ `code` [Link](https://example.com)",
    );
  });

  it("round-trips nested blockquote lists", () => {
    expect(roundTrip("> - **A**\n> - B")).toBe("> - **A**\n> - B");
  });

  it("round-trips image title", () => {
    expect(roundTrip('![Alt](wnote-asset:///tmp/image.png "Title")')).toBe(
      '![Alt](wnote-asset:///tmp/image.png "Title")',
    );
  });

  it("keeps plain editor images as markdown images", () => {
    expect(htmlToMarkdown('<img src="asset.png" alt="Alt" title="Title">').trim()).toBe(
      '![Alt](asset.png "Title")',
    );
  });

  it("persists editor image width as html image", () => {
    expect(
      htmlToMarkdown('<img src="asset.png" alt="Alt" title="Title" data-width="480px">').trim(),
    ).toBe('<img src="asset.png" alt="Alt" title="Title" width="480px">');
  });

  it("persists style image width as html image", () => {
    expect(htmlToMarkdown('<img src="asset.png" alt="Alt" style="width: 320px;">').trim()).toBe(
      '<img src="asset.png" alt="Alt" width="320px">',
    );
  });

  it("keeps image width when reopening persisted html", () => {
    expect(markdownToHtml('<img src="asset.png" alt="Alt" width="480px">')).toContain(
      'width="480px"',
    );
  });

  it("persists editor image figure metadata as html", () => {
    expect(
      htmlToMarkdown(
        '<figure data-wnote-image="true" data-align="center"><img src="asset.png" alt="Alt" data-width="480px"><figcaption>Caption</figcaption></figure>',
      ).trim(),
    ).toBe(
      '<figure data-wnote-image="true" data-align="center"><img src="asset.png" alt="Alt" width="480px"><figcaption>Caption</figcaption></figure>',
    );
  });

  it("persists tiptap figure image attributes as html", () => {
    expect(
      htmlToMarkdown(
        '<figure data-wnote-image="true" data-align="center"><img src="note.assets/a.png" alt="Alt" title="Title" data-width="50%" data-preview-src="wnote-asset:///docs/note.assets/a.png"><figcaption><p>Caption <strong>text</strong></p></figcaption></figure>',
      ).trim(),
    ).toBe(
      '<figure data-wnote-image="true" data-align="center"><img src="note.assets/a.png" alt="Alt" title="Title" width="50%"><figcaption>Caption text</figcaption></figure>',
    );
  });

  it("keeps image figure metadata when reopening persisted html", () => {
    const html = markdownToHtml(
      '<figure data-wnote-image="true" data-align="right"><img src="asset.png" alt="Alt" width="360px"><figcaption>Caption</figcaption></figure>',
    );

    expect(html).toContain("<figure");
    expect(html).toContain('data-align="right"');
    expect(html).toContain("<figcaption>Caption</figcaption>");
    expect(html).toContain('width="360px"');
  });

  it("round-trips fenced code blocks with language", () => {
    expect(roundTrip("```ts\nconst value = 1;\n```")).toBe("```ts\nconst value = 1;\n```");
  });

  it("round-trips mermaid blocks", () => {
    expect(roundTrip("```mermaid\ngraph TD\n  A --> B\n```")).toBe(
      "```mermaid\ngraph TD\n  A --> B\n```",
    );
  });

  it("round-trips inline and block math", () => {
    expect(roundTrip("inline $x^2$\n\n$$\n\\sum_i x_i\n$$")).toBe(
      "inline $x^2$\n\n$$\n\\sum_i x_i\n$$",
    );
  });

  it("converts tiptap math and mermaid nodes back to markdown", () => {
    const html =
      '<p>inline <span data-math-inline="x^2">x^2</span></p><div data-math-block="\\sum_i x_i">\\sum_i x_i</div><div data-mermaid-block="graph TD&#xA;  A --&gt; B">graph TD\n  A --&gt; B</div>';

    expect(htmlToMarkdown(html).trim()).toBe(
      "inline $x^2$\n\n$$\n\\sum_i x_i\n$$\n\n```mermaid\ngraph TD\n  A --> B\n```",
    );
  });

  it("round-trips task lists", () => {
    expect(roundTrip("- [x] Done\n- [ ] Todo")).toBe("- [x] Done\n- [ ] Todo");
  });

  it("converts tiptap task list html back to markdown", () => {
    expect(
      htmlToMarkdown(
        '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked></label><div><p>Done</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Todo</p></div></li></ul>',
      ).trim(),
    ).toBe("- [x] Done\n- [ ] Todo");
  });

  it("converts ordered list html back to markdown", () => {
    expect(htmlToMarkdown("<ol><li><p>One</p></li><li><p>Two</p></li></ol>").trim()).toBe(
      "1. One\n2. Two",
    );
  });

  it("round-trips tables", () => {
    expect(roundTrip("| A | B |\n| - | - |\n| 1 | 2 |")).toBe("| A | B |\n| - | - |\n| 1 | 2 |");
  });

  it("round-trips tables with chinese text and empty cells", () => {
    expect(roundTrip("| 名称 | 备注 |\n| - | - |\n| 苹果 |  |\n| 香蕉 | 黄色 |")).toBe(
      "| 名称 | 备注 |\n| -- | -- |\n| 苹果 |    |\n| 香蕉 | 黄色 |",
    );
  });

  it("round-trips aligned tables", () => {
    expect(roundTrip("| Left | Center | Right |\n| :--- | :---: | ---: |\n| A | B | C |")).toBe(
      "| Left | Center | Right |\n| :--- | :----: | ----: |\n| A    |    B   |     C |",
    );
  });

  it("converts tiptap table html back to markdown", () => {
    expect(
      htmlToMarkdown(
        "<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>",
      ).trim(),
    ).toBe("| A | B |\n| - | - |\n| 1 | 2 |");
  });

  it("keeps unknown html fallback blocks", () => {
    expect(roundTrip('<aside data-kind="note"><p>Keep me</p></aside>')).toBe(
      '<aside data-kind="note"><p>Keep me</p></aside>',
    );
  });

  it("keeps asset references indexable after html markdown conversion", () => {
    const markdown = htmlToMarkdown(
      '<figure data-wnote-image="true"><img src="note.assets/a.png" alt="Alt" data-width="320px"><figcaption>Caption</figcaption></figure>',
    );
    const index = buildAssetIndex(markdown, {
      documentPath: "/docs/note.md",
      exists: (path) => path === "/docs/note.assets/a.png",
    });

    expect(index.references).toHaveLength(1);
    expect(index.references[0]).toMatchObject({
      src: "note.assets/a.png",
      absolutePath: "/docs/note.assets/a.png",
      status: "ok",
    });
  });
});
