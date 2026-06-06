import { describe, expect, it } from "vitest";
import {
  applyThemeTokens,
  requiredThemeTokens,
  tableThemeTokens,
  themeNames,
  themeTokenValues,
} from "./theme-tokens";

describe("renderer theme tokens", () => {
  it("keeps the required token contract stable", () => {
    expect(themeNames).toEqual(["light", "dark"]);
    expect(requiredThemeTokens).toEqual([
      "--color-bg",
      "--color-text",
      "--color-muted",
      "--color-border",
      "--color-hover-bg",
      "--color-focus-ring",
      "--color-accent",
      "--color-link",
      "--color-code-bg",
      "--color-blockquote-border",
      "--color-placeholder",
      "--color-danger",
      "--color-table-border",
      "--color-table-header-bg",
      "--sidebar-bg",
      "--sidebar-border",
      "--editor-max-width",
      "--editor-font",
      "--editor-font-size",
      "--editor-line-height",
      "--editor-mono-font",
    ]);
  });

  it("tracks table-specific tokens explicitly", () => {
    expect(tableThemeTokens).toEqual(["--color-table-border", "--color-table-header-bg"]);
    expect(requiredThemeTokens).toEqual(expect.arrayContaining([...tableThemeTokens]));
  });

  it("defines every required token value for each theme", () => {
    for (const theme of themeNames) {
      expect(Object.keys(themeTokenValues[theme]).sort()).toEqual([...requiredThemeTokens].sort());
      for (const token of requiredThemeTokens) {
        expect(themeTokenValues[theme][token], `${theme} ${token}`).toBeTruthy();
      }
    }
  });

  it("applies theme attributes and CSS variables to the target element", () => {
    const target = fakeThemeTarget();

    applyThemeTokens(target, "dark");

    expect(target.getAttribute("data-theme")).toBe("dark");
    expect(target.style.getPropertyValue("--color-bg")).toBe("#0d1117");
    expect(target.style.getPropertyValue("--color-table-border")).toBe("#30363d");
  });
});

function fakeThemeTarget(): HTMLElement {
  const attributes = new Map<string, string>();
  const styles = new Map<string, string>();
  return {
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    style: {
      setProperty(name: string, value: string) {
        styles.set(name, value);
      },
      getPropertyValue(name: string) {
        return styles.get(name) ?? "";
      },
    },
  } as HTMLElement;
}
