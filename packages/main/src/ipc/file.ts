import { BrowserWindow, dialog, ipcMain } from "electron";
import { IpcChannel, type SaveDocumentRequest } from "@wnote/contracts";
import { openDocument, saveDocument } from "@wnote/storage-main";
import { createAppMenu } from "../menu";
import { windowManager } from "../window-manager";
import { addRecentFile, setLastOpenedFile } from "../recent-files";
import { loadSettings } from "../settings";
import type { IpcHandlerContext } from "./types";

export function registerFileIpc({ e2ePath, log }: IpcHandlerContext) {
  ipcMain.handle(IpcChannel.FileOpen, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const overridePath = e2ePath("WNOTE_E2E_OPEN_PATH");
    const filePath =
      overridePath ??
      (
        await dialog.showOpenDialog(win, {
          properties: ["openFile"],
          filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
        })
      ).filePaths[0];
    if (!filePath) return null;
    log.info("File opened via dialog:", filePath);
    const data = await openDocument(filePath);
    addRecentFile(filePath);
    setLastOpenedFile(filePath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
    return data;
  });

  ipcMain.handle(IpcChannel.FileSave, async (event, payload: SaveDocumentRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    let targetPath = payload.filePath;
    if (!targetPath) {
      targetPath = e2ePath("WNOTE_E2E_SAVE_PATH") ?? undefined;
      if (!targetPath) {
        const result = await dialog.showSaveDialog(win, {
          defaultPath: payload.defaultName ?? "untitled.md",
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (result.canceled || !result.filePath) return null;
        targetPath = result.filePath;
      }
    }
    const saved = await saveDocument({ ...payload, filePath: targetPath });
    log.info("File saved:", targetPath);
    addRecentFile(targetPath);
    setLastOpenedFile(targetPath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
    return saved;
  });
}
