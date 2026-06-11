import { expect, test } from "@playwright/test";
import { buildElectronEntrypoints, fixture, launchWNote } from "./electron-app";

test.beforeAll(() => {
  buildElectronEntrypoints();
});

test("opens the regression fixture without renderer runtime errors", async () => {
  const app = await launchWNote(fixture("editor-regression-sample.md"));

  try {
    await expect(app.page.locator(".ProseMirror")).toContainText("WNote Editor Regression Sample");
    const tableWrapper = app.page.locator(".ProseMirror .tableWrapper");
    await expect(tableWrapper).toBeVisible();
    await expect(tableWrapper).toHaveCSS("border-top-style", "solid");
    await expect(tableWrapper).toHaveCSS("border-top-width", "1px");
    await expect(app.page.locator(".ProseMirror pre").first()).toBeVisible();
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

test("keeps collapsed sidebar hidden and code block caret layer aligned", async () => {
  const app = await launchWNote(fixture("editor-regression-sample.md"));

  try {
    await expect(app.page.locator(".ProseMirror")).toContainText("WNote Editor Regression Sample");

    const sidebar = app.page.locator('aside[data-side="left"]');
    await expect(sidebar).toBeAttached();
    await expect
      .poll(() =>
        app.page.evaluate(() => {
          const aside = document.querySelector<HTMLElement>('aside[data-side="left"]');
          const resizer = aside?.nextElementSibling;
          if (!(resizer instanceof HTMLElement)) return null;
          const resizerStyle = getComputedStyle(resizer);
          return {
            asideWidth: aside.getBoundingClientRect().width,
            resizerOpacity: resizerStyle.opacity,
            resizerPointerEvents: resizerStyle.pointerEvents,
          };
        }),
      )
      .toEqual({ asideWidth: 0, resizerOpacity: "0", resizerPointerEvents: "none" });

    await app.page.getByRole("button", { name: "切换侧边栏" }).click();
    await expect(sidebar).toBeVisible();
    await app.page.getByRole("button", { name: "切换侧边栏" }).click();
    await expect
      .poll(() =>
        app.page.evaluate(() => {
          const aside = document.querySelector<HTMLElement>('aside[data-side="left"]');
          const resizer = aside?.nextElementSibling;
          if (!(resizer instanceof HTMLElement)) return null;
          const resizerStyle = getComputedStyle(resizer);
          return {
            asideWidth: aside.getBoundingClientRect().width,
            resizerOpacity: resizerStyle.opacity,
            resizerPointerEvents: resizerStyle.pointerEvents,
          };
        }),
      )
      .toEqual({ asideWidth: 0, resizerOpacity: "0", resizerPointerEvents: "none" });

    await expect
      .poll(() =>
        app.page.evaluate(() => {
          const editor = document.querySelector<HTMLElement>(".ProseMirror");
          const highlight = editor?.querySelector<HTMLElement>(
            '[data-code-block-layer="highlight"]',
          );
          const content = highlight?.nextElementSibling;
          if (!(content instanceof HTMLElement)) return null;
          const visibleCode = highlight?.querySelector<HTMLElement>("code");
          if (!highlight || !visibleCode) return null;

          const highlightStyle = getComputedStyle(highlight);
          const contentStyle = getComputedStyle(content);
          const visibleStyle = getComputedStyle(visibleCode);
          return {
            sameBlockTop:
              Math.abs(
                highlight.getBoundingClientRect().top - content.getBoundingClientRect().top,
              ) < 0.5,
            sameFontSize: highlightStyle.fontSize === contentStyle.fontSize,
            sameLineHeight: highlightStyle.lineHeight === contentStyle.lineHeight,
            samePaddingTop: highlightStyle.paddingTop === contentStyle.paddingTop,
            samePaddingLeft: highlightStyle.paddingLeft === contentStyle.paddingLeft,
            sameCodeFont: visibleStyle.fontFamily === contentStyle.fontFamily,
            sameCodeLineHeight: visibleStyle.lineHeight === contentStyle.lineHeight,
          };
        }),
      )
      .toEqual({
        sameBlockTop: true,
        sameFontSize: true,
        sameLineHeight: true,
        samePaddingTop: true,
        samePaddingLeft: true,
        sameCodeFont: true,
        sameCodeLineHeight: true,
      });

    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});
