import { existsSync } from "fs";
import { ipcMain } from "electron";
import { IpcChannel } from "@wnote/contracts";
import { openDocument } from "@wnote/storage-main";
import { createAppMenu } from "../menu";
import { windowManager } from "../window-manager";
import {
  clearRecentFiles,
  clearRecentWorkspaces,
  getLastOpenedFile,
  getRecentFiles,
  getRecentWorkspaces,
} from "../recent-files";
import { loadSettings } from "../settings";

export function registerRecentIpc() {
  ipcMain.handle(IpcChannel.RecentFilesGet, () => getRecentFiles());
  ipcMain.handle(IpcChannel.RecentFilesClear, async () => {
    clearRecentFiles();
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
  });
  ipcMain.handle(IpcChannel.RecentWorkspacesGet, () => getRecentWorkspaces());
  ipcMain.handle(IpcChannel.RecentWorkspacesClear, () => clearRecentWorkspaces());

  ipcMain.handle(IpcChannel.LastOpenedFileGet, async () => {
    const filePath = getLastOpenedFile();
    if (!filePath || !existsSync(filePath)) return null;
    return openDocument(filePath);
  });
}
