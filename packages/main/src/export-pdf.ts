import type { BrowserWindow } from "electron";
import { writeFile } from "fs/promises";
import type { ExportPdfOptions, ExportPdfRequest, ExportPreviewRequest } from "@wnote/contracts";
import { renderHtmlDocument } from "@wnote/storage-main";

export interface PdfWindow {
  webContents: {
    executeJavaScript(script: string, userGesture?: boolean): Promise<unknown>;
    printToPDF(options: PdfPrintOptions): Promise<Uint8Array>;
  };
  loadURL(url: string): Promise<void>;
  destroy(): void;
}

export interface PreviewWindow {
  loadURL(url: string): Promise<void>;
}

export interface PdfWindowOptions {
  show: false;
  width: number;
  height: number;
  webPreferences: {
    sandbox: true;
    contextIsolation: true;
    nodeIntegration: false;
  };
}

export interface PreviewWindowOptions {
  show: true;
  width: number;
  height: number;
  title: string;
  webPreferences: {
    sandbox: true;
    contextIsolation: true;
    nodeIntegration: false;
  };
}

export interface PdfPrintOptions {
  pageSize: "A4" | "Letter";
  landscape: boolean;
  printBackground: boolean;
  preferCSSPageSize: true;
  margins: ReturnType<typeof pdfMargins>;
}

export type CreatePdfWindow = (options: PdfWindowOptions) => PdfWindow;
export type CreatePreviewWindow = (options: PreviewWindowOptions) => PreviewWindow;
export type RenderHtml = (
  payload: (ExportPdfRequest | ExportPreviewRequest) & { filePath: string },
) => Promise<string>;

export function pdfPrintOptions(options: ExportPdfOptions = {}): PdfPrintOptions {
  return {
    pageSize: options.pageSize ?? "A4",
    landscape: options.orientation === "landscape",
    printBackground: options.printBackground ?? true,
    preferCSSPageSize: true,
    margins: pdfMargins(options.margin),
  };
}

export function pdfMargins(margin: ExportPdfOptions["margin"]) {
  switch (margin) {
    case "compact":
      return { marginType: "custom" as const, top: 0.47, bottom: 0.47, left: 0.47, right: 0.47 };
    case "wide":
      return { marginType: "custom" as const, top: 1.1, bottom: 1.1, left: 1.1, right: 1.1 };
    default:
      return { marginType: "default" as const };
  }
}

export function pdfWindowOptions(): PdfWindowOptions {
  return {
    show: false,
    width: 960,
    height: 1280,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

export function previewWindowOptions(format: ExportPreviewRequest["format"]): PreviewWindowOptions {
  return {
    show: true,
    width: format === "pdf" ? 940 : 1100,
    height: format === "pdf" ? 1200 : 820,
    title: format === "pdf" ? "PDF 导出预览 — WNote" : "HTML 导出预览 — WNote",
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

export async function exportPdfDocument(
  payload: ExportPdfRequest & { filePath: string },
  createWindow: CreatePdfWindow,
  renderHtml: RenderHtml = renderHtmlDocument,
) {
  const html = await renderHtml({ ...payload, filePath: payload.filePath });
  const pdfWindow = createWindow(pdfWindowOptions());
  try {
    await pdfWindow.loadURL(toHtmlDataUrl(html));
    await pdfWindow.webContents.executeJavaScript(waitForDocumentReadyScript(), true);
    const data = await pdfWindow.webContents.printToPDF(pdfPrintOptions(payload.options?.pdf));
    await writeFile(payload.filePath, data);
    return { filePath: payload.filePath };
  } finally {
    pdfWindow.destroy();
  }
}

export async function openExportPreview(
  payload: ExportPreviewRequest,
  createWindow: CreatePreviewWindow,
  renderHtml: RenderHtml = renderHtmlDocument,
) {
  const previewPath =
    payload.defaultName ?? (payload.format === "pdf" ? "untitled.pdf" : "untitled.html");
  const html = await renderHtml({
    ...payload,
    filePath: previewPath,
  });
  const previewWindow = createWindow(previewWindowOptions(payload.format));
  await previewWindow.loadURL(toHtmlDataUrl(html));
  return { ok: true };
}

export function toHtmlDataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function waitForDocumentReadyScript(): string {
  return `new Promise((resolve) => {
        const done = () => setTimeout(resolve, 300);
        if (document.readyState === "complete") done();
        else window.addEventListener("load", done, { once: true });
      })`;
}

export function asPdfWindow(window: BrowserWindow): PdfWindow {
  return window;
}

export function asPreviewWindow(window: BrowserWindow): PreviewWindow {
  return window;
}
