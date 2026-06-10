import { describe, expect, it } from "vitest";
import { assetMimeFromPath, filePathFromAssetUrl } from "./asset-protocol";

describe("asset protocol", () => {
  it("decodes local asset URLs without treating path characters as URL syntax", () => {
    expect(filePathFromAssetUrl("wnote-asset://local/%2Ftmp%2Fnote.assets%2Fa%231.png")).toBe(
      "/tmp/note.assets/a#1.png",
    );
    expect(filePathFromAssetUrl("wnote-asset://local/%2Ftmp%2Fnote.assets%2Fa%3F1.png")).toBe(
      "/tmp/note.assets/a?1.png",
    );
    expect(
      filePathFromAssetUrl(
        "wnote-asset://local/%2Ftmp%2F%E4%B8%AD%E6%96%87%20%E5%9B%BE%E7%89%87.png",
      ),
    ).toBe("/tmp/中文 图片.png");
  });

  it("keeps legacy asset URLs readable", () => {
    expect(filePathFromAssetUrl("wnote-asset:///tmp/note.assets/a.png")).toBe(
      "/tmp/note.assets/a.png",
    );
    expect(filePathFromAssetUrl("wnote-asset://C:/docs/a.png")).toBe("C:/docs/a.png");
  });

  it("resolves image mime types from paths", () => {
    expect(assetMimeFromPath("/tmp/a.svg")).toBe("image/svg+xml");
    expect(assetMimeFromPath("/tmp/a.png")).toBe("image/png");
    expect(assetMimeFromPath("/tmp/a.unknown")).toBe("application/octet-stream");
  });
});
