import { describe, expect, it } from "vitest";
import {
  clampImageWidth,
  imageAssetResolverFromExtension,
  imageDisplaySource,
  imageFigureAttrs,
  imageStyle,
  imageWidthLabel,
  normalizeImageAlign,
  normalizeImageWidth,
  normalizeNullableText,
} from "./image-utils";

describe("image utils", () => {
  it("normalizes align values", () => {
    expect(normalizeImageAlign("left")).toBe("left");
    expect(normalizeImageAlign("center")).toBe("center");
    expect(normalizeImageAlign("right")).toBe("right");
    expect(normalizeImageAlign("justify")).toBeNull();
  });

  it("normalizes width values", () => {
    expect(normalizeImageWidth("320px")).toBe("320px");
    expect(normalizeImageWidth("50%")).toBe("50%");
    expect(normalizeImageWidth(" 480px ")).toBe("480px");
    expect(normalizeImageWidth("calc(100%)")).toBeNull();
    expect(normalizeImageWidth("100vw")).toBeNull();
  });

  it("creates figure attrs only when figure metadata is needed", () => {
    expect(imageFigureAttrs({ src: "a.png" })).toBeNull();
    expect(imageFigureAttrs({ src: "a.png", align: "right" })).toEqual({
      "data-wnote-image": "true",
      "data-align": "right",
    });
    expect(imageFigureAttrs({ src: "a.png", caption: "Caption" })).toEqual({
      "data-wnote-image": "true",
    });
  });

  it("creates image style only for normalized width", () => {
    expect(imageStyle(normalizeImageWidth("320px"))).toEqual({ width: "320px" });
    expect(imageStyle(normalizeImageWidth("bad"))).toBeUndefined();
  });

  it("labels image width state", () => {
    expect(imageWidthLabel(null)).toBe("Auto");
    expect(imageWidthLabel("75%")).toBe("75%");
    expect(imageWidthLabel("75%", "320px")).toBe("320px");
  });

  it("normalizes optional text", () => {
    expect(normalizeNullableText(" Caption ")).toBe("Caption");
    expect(normalizeNullableText(" ")).toBeNull();
    expect(normalizeNullableText(null)).toBeNull();
  });

  it("clamps image widths", () => {
    expect(clampImageWidth(20, 600)).toBe(80);
    expect(clampImageWidth(320.4, 600)).toBe(320);
    expect(clampImageWidth(900, 600)).toBe(600);
    expect(clampImageWidth(900, 40)).toBe(80);
  });

  it("prefers preview source before resolving assets", () => {
    expect(imageDisplaySource("a.png", "preview.png", () => "resolved.png")).toBe("preview.png");
    expect(imageDisplaySource("a.png", "", () => "resolved.png")).toBeNull();
    expect(imageDisplaySource("a.png", "", () => null)).toBeNull();
    expect(imageDisplaySource("a.png", null)).toBe("a.png");
  });

  it("safely reads asset resolvers from optional extensions", () => {
    const resolver = (src: string) => `resolved:${src}`;
    expect(imageAssetResolverFromExtension(undefined)).toBeUndefined();
    expect(imageAssetResolverFromExtension({})).toBeUndefined();
    expect(imageAssetResolverFromExtension({ options: { assetResolver: "bad" } })).toBeUndefined();
    expect(
      imageAssetResolverFromExtension({ options: { assetResolver: resolver } })?.("a.png"),
    ).toBe("resolved:a.png");
  });
});
