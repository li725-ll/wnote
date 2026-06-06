import { expect, test } from "@playwright/test";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildElectronEntrypoints, launchWNote } from "./electron-app";

test.beforeAll(() => {
  buildElectronEntrypoints();
});

test("exports the active document to HTML through Electron IPC", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-e2e-export-"));
  const exportPath = join(dir, "note.html");
  const app = await launchWNote({
    env: {
      WNOTE_E2E_EXPORT_HTML_PATH: exportPath,
    },
  });

  try {
    const editor = app.page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill("# Exported\n\nHTML export from Playwright.");

    await app.page.evaluate(async () => {
      const content = document.querySelector(".ProseMirror")?.textContent ?? "";
      await window.electronAPI.invoke("export:html", {
        content,
        defaultName: "note.html",
        options: {
          inlineLocalImages: false,
          renderMermaid: true,
          theme: "light",
        },
      });
    });

    await expect.poll(() => readFileSync(exportPath, "utf8")).toContain("HTML export");
    const html = readFileSync(exportPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Exported");
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

test("exports the active document to PDF through Electron IPC", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wnote-e2e-export-pdf-"));
  const exportPath = join(dir, "note.pdf");
  const app = await launchWNote({
    env: {
      WNOTE_E2E_EXPORT_PDF_PATH: exportPath,
    },
  });

  try {
    const editor = app.page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill("# PDF Export\n\nPDF export from Playwright.");

    await app.page.evaluate(async () => {
      const content = document.querySelector(".ProseMirror")?.textContent ?? "";
      await window.electronAPI.invoke("export:pdf", {
        content,
        defaultName: "note.pdf",
        options: {
          inlineLocalImages: false,
          renderMermaid: true,
          theme: "light",
          pdf: {
            pageSize: "A4",
            orientation: "portrait",
            margin: "default",
            printBackground: true,
          },
        },
      });
    });

    await expect.poll(() => existsSync(exportPath)).toBe(true);
    expect(statSync(exportPath).size).toBeGreaterThan(1000);
    expect(readFileSync(exportPath).subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(app.errors).toEqual([]);
  } finally {
    await app.close();
  }
});
