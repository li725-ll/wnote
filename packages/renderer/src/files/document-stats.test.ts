import { describe, expect, it } from "vitest";
import { countTextWords, documentStats, markdownToCountableText } from "./document-stats";

describe("document stats", () => {
  it("counts CJK characters as words and latin text as words", () => {
    expect(countTextWords("你好 world 2026")).toBe(4);
    expect(countTextWords("写作工具 Markdown editor")).toBe(6);
  });

  it("counts visible markdown text instead of markup bytes", () => {
    const stats = documentStats(
      [
        "# 标题 Title",
        "",
        "中文内容 with **bold text** and [link label](https://example.com/long-url).",
        "",
        "![图片说明](note.assets/a.png)",
      ].join("\n"),
    );

    expect(stats.words).toBe(17);
    expect(stats.characters).toBe(40);
    expect(stats.lines).toBe(5);
  });

  it("keeps code content countable while removing fences and language labels", () => {
    expect(markdownToCountableText("```ts\nconst value = 1;\n```")).toBe("const value = 1;");
    expect(documentStats("```ts\nconst value = 1;\n```").words).toBe(3);
  });
});
