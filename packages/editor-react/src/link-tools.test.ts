import { describe, expect, it } from "vitest";
import { createLinkOpenTarget } from "./link-tools";

describe("link tools", () => {
  it("creates a safe external link target", () => {
    expect(createLinkOpenTarget(" https://example.com ")).toEqual({
      href: "https://example.com",
      target: "_blank",
      features: "noopener,noreferrer",
    });
  });

  it("skips empty link targets", () => {
    expect(createLinkOpenTarget("")).toBeNull();
    expect(createLinkOpenTarget(null)).toBeNull();
  });
});
