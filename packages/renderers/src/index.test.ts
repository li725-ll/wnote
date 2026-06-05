import { describe, expect, it } from "vitest";
import { highlight } from "./shiki";
import { renderBlockMath, renderInlineMath } from "./katex";

describe("@wnote/renderers", () => {
  it("highlights supported languages with lazy loaded shiki grammars", async () => {
    const html = await highlight("const value: number = 1", "typescript", "light");

    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("shiki");
    expect(html).toContain("value");
  });

  it("normalizes common language aliases", async () => {
    const html = await highlight("const value = 1", "js", "dark");

    expect(html).toContain("<pre");
    expect(html).toContain("value");
  });

  it("falls back to escaped plain code for unsupported languages", async () => {
    const html = await highlight("<tag>", "unknown", "light");

    expect(html).toBe("<pre><code>&lt;tag&gt;</code></pre>");
  });

  it("renders inline and block math", () => {
    expect(renderInlineMath("x^2")).toContain("katex");
    expect(renderBlockMath("x^2")).toContain("katex-display");
  });
});
