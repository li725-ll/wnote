import { mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  exportPdfDocument,
  openExportPreview,
  pdfMargins,
  pdfPrintOptions,
  pdfWindowOptions,
  previewWindowOptions,
  toHtmlDataUrl,
  waitForDocumentReadyScript,
  type PdfWindow,
  type PreviewWindow,
} from "./export-pdf";

describe("PDF export helpers", () => {
  it("uses stable default print options", () => {
    expect(pdfPrintOptions()).toEqual({
      pageSize: "A4",
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "default" },
    });
  });

  it("maps explicit print options", () => {
    expect(
      pdfPrintOptions({
        pageSize: "Letter",
        orientation: "landscape",
        margin: "wide",
        printBackground: false,
      }),
    ).toEqual({
      pageSize: "Letter",
      landscape: true,
      printBackground: false,
      preferCSSPageSize: true,
      margins: { marginType: "custom", top: 1.1, bottom: 1.1, left: 1.1, right: 1.1 },
    });
  });

  it("maps all pdf margin presets", () => {
    expect(pdfMargins("default")).toEqual({ marginType: "default" });
    expect(pdfMargins(undefined)).toEqual({ marginType: "default" });
    expect(pdfMargins("compact")).toEqual({
      marginType: "custom",
      top: 0.47,
      bottom: 0.47,
      left: 0.47,
      right: 0.47,
    });
    expect(pdfMargins("wide")).toEqual({
      marginType: "custom",
      top: 1.1,
      bottom: 1.1,
      left: 1.1,
      right: 1.1,
    });
  });

  it("keeps pdf render window sandboxed and hidden", () => {
    expect(pdfWindowOptions()).toEqual({
      show: false,
      width: 960,
      height: 1280,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  });

  it("maps preview window options by format", () => {
    expect(previewWindowOptions("html")).toMatchObject({
      show: true,
      width: 1100,
      height: 820,
      title: "HTML 导出预览 — WNote",
    });
    expect(previewWindowOptions("pdf")).toMatchObject({
      show: true,
      width: 940,
      height: 1200,
      title: "PDF 导出预览 — WNote",
    });
    expect(previewWindowOptions("pdf").webPreferences).toEqual({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    });
  });

  it("encodes preview html as a data url", () => {
    const url = toHtmlDataUrl("<h1>A&B</h1>");

    expect(url).toBe("data:text/html;charset=utf-8,%3Ch1%3EA%26B%3C%2Fh1%3E");
  });

  it("waits for document readiness before printing", () => {
    expect(waitForDocumentReadyScript()).toContain("document.readyState");
    expect(waitForDocumentReadyScript()).toContain("setTimeout(resolve, 300)");
  });

  it("uses shared html rendering when opening export previews", async () => {
    const loadedUrls: string[] = [];
    const renderHtml = vi.fn(async () => "<h1>Preview</h1>");

    await expect(
      openExportPreview(
        {
          content: "# Preview",
          defaultName: "preview.html",
          format: "html",
          options: { theme: "dark" },
        },
        () => previewWindow(loadedUrls),
        renderHtml,
      ),
    ).resolves.toEqual({ ok: true });

    expect(renderHtml).toHaveBeenCalledWith({
      content: "# Preview",
      defaultName: "preview.html",
      filePath: "preview.html",
      format: "html",
      options: { theme: "dark" },
    });
    expect(loadedUrls[0]).toBe(toHtmlDataUrl("<h1>Preview</h1>"));
  });

  it("uses shared html rendering and print options when exporting PDFs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wnote-pdf-export-"));
    const filePath = join(dir, "out.pdf");
    const renderHtml = vi.fn(async () => "<h1>PDF</h1>");
    const printedOptions: unknown[] = [];

    await expect(
      exportPdfDocument(
        {
          content: "# PDF",
          filePath,
          defaultName: "out.pdf",
          options: {
            pdf: {
              pageSize: "Letter",
              orientation: "landscape",
              margin: "compact",
              printBackground: false,
            },
          },
        },
        () => pdfWindow(printedOptions),
        renderHtml,
      ),
    ).resolves.toEqual({ filePath });

    expect(renderHtml).toHaveBeenCalledWith({
      content: "# PDF",
      filePath,
      defaultName: "out.pdf",
      options: {
        pdf: {
          pageSize: "Letter",
          orientation: "landscape",
          margin: "compact",
          printBackground: false,
        },
      },
    });
    expect(printedOptions[0]).toEqual(
      pdfPrintOptions({
        pageSize: "Letter",
        orientation: "landscape",
        margin: "compact",
        printBackground: false,
      }),
    );
    expect(await readFile(filePath)).toEqual(Buffer.from([1, 2, 3]));
  });
});

function previewWindow(loadedUrls: string[]): PreviewWindow {
  return {
    async loadURL(url) {
      loadedUrls.push(url);
    },
  };
}

function pdfWindow(printedOptions: unknown[]): PdfWindow {
  return {
    webContents: {
      async executeJavaScript() {
        return undefined;
      },
      async printToPDF(options) {
        printedOptions.push(options);
        return Buffer.from([1, 2, 3]);
      },
    },
    async loadURL() {
      return undefined;
    },
    destroy() {
      return undefined;
    },
  };
}
