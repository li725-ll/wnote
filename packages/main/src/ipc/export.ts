import { BrowserWindow, dialog, ipcMain } from "electron";
import {
  IpcChannel,
  type ExportHtmlRequest,
  type ExportPdfRequest,
  type ExportPreviewRequest,
} from "@wnote/contracts";
import { exportHtmlDocument } from "@wnote/storage-main";
import { asPdfWindow, asPreviewWindow, exportPdfDocument, openExportPreview } from "../export-pdf";
import type { IpcHandlerContext } from "./types";

export function registerExportIpc({ e2ePath, log }: IpcHandlerContext) {
  ipcMain.handle(IpcChannel.ExportHtml, async (event, payload: ExportHtmlRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const targetPath = e2ePath("WNOTE_E2E_EXPORT_HTML_PATH");
    const filePath =
      targetPath ??
      (
        await dialog.showSaveDialog(win, {
          defaultPath: payload.defaultName ?? "untitled.html",
          filters: [{ name: "HTML", extensions: ["html"] }],
        })
      ).filePath;
    if (!filePath) return null;
    const exported = await exportHtmlDocument({ ...payload, filePath });
    log.info("HTML exported:", exported.filePath);
    return exported;
  });

  ipcMain.handle(IpcChannel.ExportPdf, async (event, payload: ExportPdfRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const targetPath = e2ePath("WNOTE_E2E_EXPORT_PDF_PATH");
    const filePath =
      targetPath ??
      (
        await dialog.showSaveDialog(win, {
          defaultPath: payload.defaultName ?? "untitled.pdf",
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        })
      ).filePath;
    if (!filePath) return null;
    const exported = await exportPdfDocument({ ...payload, filePath }, (options) =>
      asPdfWindow(new BrowserWindow(options)),
    );
    log.info("PDF exported:", exported.filePath);
    return exported;
  });

  ipcMain.handle(IpcChannel.ExportPreview, async (_event, payload: ExportPreviewRequest) => {
    const result = await openExportPreview(payload, (options) =>
      asPreviewWindow(new BrowserWindow(options)),
    );
    log.info("Export preview opened:", payload.format);
    return result;
  });
}
