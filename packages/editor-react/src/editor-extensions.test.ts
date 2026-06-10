import { describe, expect, it } from "vitest";
import type { AnyExtension } from "@tiptap/core";
import { createEditorExtensions } from "./editor-extensions";

describe("editor extensions", () => {
  it("does not register duplicate extension names", () => {
    const names = extensionNames(createEditorExtensions({ placeholder: "Start" }));
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
  });
});

function extensionNames(extensions: AnyExtension[]): string[] {
  return extensions.flatMap((extension) => {
    const nested =
      typeof extension.config.addExtensions === "function"
        ? extension.config.addExtensions.call(extension as never)
        : [];
    return [extension.name, ...extensionNames(nested as AnyExtension[])].filter(Boolean);
  });
}
