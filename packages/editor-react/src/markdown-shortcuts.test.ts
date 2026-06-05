import { describe, expect, it } from "vitest";
import { blockCommand, isHorizontalRuleShortcut } from "./markdown-shortcuts";

describe("markdown shortcuts", () => {
  it("detects headings", () => {
    expect(blockCommand("#")).toEqual({ type: "heading", level: 1 });
    expect(blockCommand("####")).toEqual({ type: "heading", level: 4 });
  });

  it("detects block commands", () => {
    expect(blockCommand(">")).toEqual({ type: "blockquote" });
    expect(blockCommand("-")).toEqual({ type: "bulletList" });
    expect(blockCommand("1.")).toEqual({ type: "orderedList" });
    expect(blockCommand("1)")).toEqual({ type: "orderedList" });
    expect(blockCommand("- [ ]")).toEqual({ type: "taskList" });
    expect(blockCommand("- [x]")).toEqual({ type: "taskList" });
    expect(blockCommand("[ ]")).toEqual({ type: "taskList" });
    expect(blockCommand("[X]")).toEqual({ type: "taskList" });
  });

  it("detects code, mermaid, and math blocks", () => {
    expect(blockCommand("```ts")).toEqual({ type: "codeBlock", language: "ts" });
    expect(blockCommand("```mermaid")).toEqual({ type: "mermaidBlock" });
    expect(blockCommand("$$")).toEqual({ type: "blockMath" });
  });

  it("ignores non-shortcuts", () => {
    expect(blockCommand("hello")).toBeNull();
    expect(blockCommand("## title")).toBeNull();
    expect(blockCommand("```")).toEqual({ type: "codeBlock", language: undefined });
  });

  it("detects horizontal rule shortcuts", () => {
    expect(isHorizontalRuleShortcut("---")).toBe(true);
    expect(isHorizontalRuleShortcut("***")).toBe(true);
    expect(isHorizontalRuleShortcut("___")).toBe(true);
    expect(isHorizontalRuleShortcut("--")).toBe(false);
    expect(isHorizontalRuleShortcut("*** title")).toBe(false);
  });
});
