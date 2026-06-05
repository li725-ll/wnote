import { describe, expect, it, vi } from "vitest";
import { copyCodeBlockText } from "./code-block-utils";

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
});
