import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildElectronEntrypoints, launchWNote } from "./electron-app";

test.beforeAll(() => {
  buildElectronEntrypoints();
});

async function openLeftSidebar(app: Awaited<ReturnType<typeof launchWNote>>) {
  await app.page.getByRole("button", { name: "切换侧边栏" }).click();
  await expect(
    app.page.getByRole("button", { name: /^(打开|打开目录|切换)$/ }).first(),
  ).toBeVisible();
}

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

test("opens documents from a workspace tree", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-workspace-e2e-"));
  mkdirSync(join(dir, "notes"));
  writeFileSync(join(dir, "notes", "daily.md"), "# Daily Note\n\nOpened from workspace.");
  writeFileSync(join(dir, "ignore.png"), "ignored");

  const app = await launchWNote({
    env: {
      WNOTE_E2E_WORKSPACE_PATH: dir,
    },
  });

  try {
    await openLeftSidebar(app);
    await app.page
      .getByRole("button", { name: /^(打开|打开目录|切换)$/ })
      .first()
      .click();
    await expect(app.page.getByText("daily.md")).toBeVisible();
    await app.page.getByRole("button", { name: /daily\.md/ }).click();
    await expect(app.page.locator(".ProseMirror")).toContainText("Daily Note");
    await expect(app.page.locator(".ProseMirror")).toContainText("Opened from workspace.");
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

test("creates files and folders from the workspace panel", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-workspace-create-e2e-"));

  const app = await launchWNote({
    env: {
      WNOTE_E2E_WORKSPACE_PATH: dir,
    },
  });

  try {
    await openLeftSidebar(app);
    await app.page
      .getByRole("button", { name: /^(打开|打开目录|切换)$/ })
      .first()
      .click();

    await app.page.getByRole("button", { name: "+ 文件", exact: true }).click();
    await app.page.getByRole("textbox", { name: "文件名" }).fill("created note");
    await app.page.getByRole("button", { name: "创建" }).click();
    await expect(app.page.getByRole("button", { name: /created note\.md/ })).toBeVisible();
    await expect(app.page.locator(".ProseMirror")).toBeVisible();
    expect(existsSync(join(dir, "created note.md"))).toBe(true);

    await app.page.getByRole("button", { name: "+ 文件夹", exact: true }).click();
    await app.page.getByRole("textbox", { name: "文件夹名" }).fill("drafts");
    await app.page.getByRole("button", { name: "创建" }).click();
    expect(existsSync(join(dir, "drafts"))).toBe(true);
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

test("renames, refreshes, and deletes workspace files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-workspace-manage-e2e-"));
  writeFileSync(join(dir, "draft.md"), "# Draft\n\nBefore rename.");

  const app = await launchWNote({
    env: {
      WNOTE_E2E_WORKSPACE_PATH: dir,
    },
  });

  try {
    await openLeftSidebar(app);
    await app.page
      .getByRole("button", { name: /^(打开|打开目录|切换)$/ })
      .first()
      .click();
    await app.page.getByRole("button", { name: /draft\.md/ }).click();
    await expect(app.page.locator(".ProseMirror")).toContainText("Draft");

    await app.page
      .getByRole("button", { name: /draft\.md/ })
      .getByRole("button", { name: "改名", exact: true })
      .click();
    await app.page.getByRole("textbox", { name: "重命名" }).fill("renamed");
    await app.page.getByRole("button", { name: "保存" }).click();
    await expect(app.page.getByRole("button", { name: /renamed\.md/ })).toBeVisible();
    await expect(app.page.getByRole("main").getByText("renamed.md")).toBeVisible();
    expect(existsSync(join(dir, "draft.md"))).toBe(false);
    expect(existsSync(join(dir, "renamed.md"))).toBe(true);

    writeFileSync(join(dir, "external.md"), "# External");
    await app.page.getByRole("button", { name: "刷新" }).click();
    await expect(app.page.getByRole("button", { name: /external\.md/ })).toBeVisible();

    app.page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await app.page
      .getByRole("button", { name: /renamed\.md/ })
      .locator('[role="button"]', { hasText: "删除" })
      .click();
    await expect(app.page.getByRole("button", { name: /renamed\.md/ })).toHaveCount(0);
    expect(existsSync(join(dir, "renamed.md"))).toBe(false);
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});
