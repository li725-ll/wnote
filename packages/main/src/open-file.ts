import type { BrowserWindow } from "electron";
import { IpcChannel } from "@wnote/contracts";
import { openDocument } from "@wnote/storage-main";
import { addRecentFile, setLastOpenedFile } from "./recent-files";

export async function openFileInWindow(win: BrowserWindow, filePath: string): Promise<void> {
  const data = await openDocument(filePath);
  rememberOpenedFile(filePath);
  await waitForWindowContent(win);
  win.webContents.send(IpcChannel.FileOpened, data);
}

export function rememberOpenedFile(filePath: string): void {
  addRecentFile(filePath);
  setLastOpenedFile(filePath);
}

export function waitForWindowContent(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed() || !win.webContents.isLoading()) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timeout);
      win.webContents.removeListener("did-finish-load", done);
      win.webContents.removeListener("did-fail-load", done);
      resolve();
    };
    const timeout = setTimeout(done, 5000);
    win.webContents.once("did-finish-load", done);
    win.webContents.once("did-fail-load", done);
  });
}
