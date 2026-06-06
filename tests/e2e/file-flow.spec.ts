import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildElectronEntrypoints, launchWNote } from "./electron-app";

test.beforeAll(() => {
  buildElectronEntrypoints();
});

test("saves a new document and reopens it through the app file flow", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-e2e-"));
  const savedPath = join(dir, "saved-note.md");
  const app = await launchWNote({
    env: {
      WNOTE_E2E_SAVE_PATH: savedPath,
    },
  });

  try {
    const editor = app.page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill("# Saved\n\nContent written by Playwright.");

    await app.page.evaluate(async () => {
      const content = document.querySelector(".ProseMirror")?.textContent ?? "";
      await window.electronAPI.invoke("file:save", {
        content,
        defaultName: "saved-note.md",
      });
    });
    await expect.poll(() => readFileSync(savedPath, "utf8")).toContain("Content written");
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }

  const reopened = await launchWNote(savedPath);
  try {
    const editor = reopened.page.locator(".ProseMirror");
    await expect(editor).toContainText("Saved");
    await expect(editor).toContainText("Content written by Playwright.");
    expect(reopened.errors).toEqual([]);
  } finally {
    await reopened.close();
  }
});
