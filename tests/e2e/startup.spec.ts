import { expect, test } from "@playwright/test";
import { buildElectronEntrypoints, fixture, launchWNote } from "./electron-app";

test.beforeAll(() => {
  buildElectronEntrypoints();
});

test("opens the regression fixture without renderer runtime errors", async () => {
  const app = await launchWNote(fixture("editor-regression-sample.md"));

  try {
    await expect(app.page.locator(".ProseMirror")).toContainText("WNote Editor Regression Sample");
    await expect(app.page.locator(".ProseMirror table")).toBeVisible();
    await expect(app.page.locator(".ProseMirror pre").first()).toBeVisible();
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});
