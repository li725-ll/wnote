import { describe, expect, it, vi } from "vitest";
import {
  codeLanguageLabel,
  commonCodeLanguages,
  copyButtonLabel,
  copyCodeBlockText,
  normalizeCodeLanguage,
} from "./code-block-utils";

describe("code block utils", () => {
  it("copies non-empty code through the provided clipboard", async () => {
    const clipboard = { writeText: vi.fn(async () => undefined) };

    await expect(copyCodeBlockText("const a = 1", clipboard)).resolves.toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledWith("const a = 1");
  });

  it("skips empty code and missing clipboard support", async () => {
    await expect(copyCodeBlockText("", { writeText: vi.fn() })).resolves.toBe(false);
    await expect(copyCodeBlockText("x", undefined)).resolves.toBe(false);
  });

  it("normalizes code language values", () => {
    expect(normalizeCodeLanguage(" TSX ")).toBe("tsx");
    expect(normalizeCodeLanguage("text")).toBeNull();
    expect(normalizeCodeLanguage(" ")).toBeNull();
    expect(normalizeCodeLanguage(null)).toBeNull();
  });

  it("labels language and copy button states", () => {
    expect(codeLanguageLabel(null)).toBe("text");
    expect(codeLanguageLabel("ts")).toBe("ts");
    expect(copyButtonLabel("idle")).toBe("Copy");
    expect(copyButtonLabel("copied")).toBe("Copied");
    expect(copyButtonLabel("failed")).toBe("Failed");
  });

  it("keeps common language presets compact", () => {
    expect(commonCodeLanguages).toEqual(["text", "ts", "tsx", "js", "json", "css", "html", "md"]);
  });
});
