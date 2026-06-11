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
          const firstTextRect = (root: Element): DOMRect | null => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let text: Text | null = null;
            for (;;) {
              const next = walker.nextNode();
              if (!(next instanceof Text)) break;
              if (next.nodeValue?.trim()) {
                text = next;
                break;
              }
            }
            if (!text?.nodeValue?.trim()) return null;
            const range = document.createRange();
            const start = text.nodeValue.length - text.nodeValue.trimStart().length;
            range.setStart(text, start);
            range.setEnd(text, Math.min(text.nodeValue.length, start + 1));
            return range.getClientRects()[0] ?? null;
          };
          const highlightTextRect = firstTextRect(highlight);
          const contentTextRect = firstTextRect(content);

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
            sameFirstLineTop:
              !!highlightTextRect &&
              !!contentTextRect &&
              Math.abs(highlightTextRect.top - contentTextRect.top) < 0.75,
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
        sameFirstLineTop: true,
      });

    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

test("keeps code block presentation stable while editing", async () => {
  const app = await launchWNote();

  try {
    const editor = app.page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await app.page.keyboard.type("```ts");
    await app.page.keyboard.press("Enter");
    await app.page.keyboard.type("type Stable = true;");

    const codeBlock = app.page.locator('[data-code-block-layer="content"]').first();
    await expect(codeBlock).toBeVisible();
    await codeBlock.click();
    await app.page.keyboard.press("End");
    await app.page.keyboard.press("Enter");
    await app.page.keyboard.press("Tab");
    await app.page.keyboard.type("const value = 1;", { delay: 20 });

    await expect
      .poll(() =>
        app.page.evaluate(() => {
          const content = document.querySelector<HTMLElement>('[data-code-block-layer="content"]');
          const highlight =
            content?.previousElementSibling instanceof HTMLElement
              ? content.previousElementSibling
              : null;
          if (!content || !highlight) return null;
          const contentStyle = getComputedStyle(content);
          const highlightStyle = getComputedStyle(highlight);
          return {
            contentTransparent: contentStyle.color === "rgba(0, 0, 0, 0)",
            highlightVisible: highlightStyle.visibility === "visible",
            highlightText: highlight.textContent,
            text: content.textContent,
          };
        }),
      )
      .toEqual({
        contentTransparent: true,
        highlightVisible: true,
        highlightText: "type Stable = true;\n\tconst value = 1;",
        text: "type Stable = true;\n\tconst value = 1;",
      });

    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});
