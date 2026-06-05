import { describe, expect, it } from "vitest";
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

  it("round-trips task lists", () => {
    expect(roundTrip("- [x] Done\n- [ ] Todo")).toBe("- [x] Done\n- [ ] Todo");
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
});
