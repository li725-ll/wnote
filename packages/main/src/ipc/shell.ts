import { ipcMain, shell } from "electron";
import { IpcChannel, type ShellPathRequest } from "@wnote/contracts";

export function registerShellIpc() {
  ipcMain.handle(IpcChannel.ShellShowItemInFolder, (_event, payload: ShellPathRequest) => {
    if (!payload.filePath) return { ok: false, error: "Missing file path" };
    shell.showItemInFolder(payload.filePath);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.ShellOpenPath, async (_event, payload: ShellPathRequest) => {
    if (!payload.filePath) return { ok: false, error: "Missing file path" };
    const error = await shell.openPath(payload.filePath);
    return error ? { ok: false, error } : { ok: true };
  });
}
