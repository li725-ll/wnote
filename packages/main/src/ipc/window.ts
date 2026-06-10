import { BrowserWindow, ipcMain } from "electron";
import { IpcChannel } from "@wnote/contracts";
import { createAppMenu } from "../menu";
import { windowManager } from "../window-manager";
import { loadSettings } from "../settings";

export function registerWindowIpc() {
  ipcMain.handle(IpcChannel.WindowNew, async () => {
    const settings = await loadSettings();
    const win = windowManager.create({ isNew: true });
    createAppMenu(win, settings);
  });

  ipcMain.on(IpcChannel.WindowTitleSet, (event, title: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setTitle(`${title} — WNote`);
  });

  ipcMain.handle(IpcChannel.WindowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle(IpcChannel.WindowMaximize, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });

  ipcMain.handle(IpcChannel.WindowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
