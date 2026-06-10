import { BrowserWindow, dialog, ipcMain } from "electron";
import { IpcChannel } from "@wnote/contracts";
import { deleteAsset, deleteAssets, importAsset, saveAsset } from "@wnote/storage-main";
import { getDataDirectory } from "../settings";
import type { IpcHandlerContext } from "./types";

export function registerAssetsIpc({ log }: IpcHandlerContext) {
  ipcMain.handle(
    IpcChannel.ImageSave,
    async (
      _event,
      payload: { buffer: ArrayBuffer; ext: string; originalName?: string; mime?: string },
    ) => {
      const asset = await saveAsset(payload, { dataDirectory: getDataDirectory() });
      log.info("Image saved:", asset.absolutePath);
      return asset;
    },
  );

  ipcMain.handle(IpcChannel.AssetImport, async (event, payload: { documentPath?: string } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !payload.documentPath) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "apng"],
        },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const asset = await importAsset({
      sourcePath: result.filePaths[0],
      documentPath: payload.documentPath,
    });
    log.info("Asset imported:", asset.absolutePath);
    return asset;
  });

  ipcMain.handle(
    IpcChannel.AssetDelete,
    async (_event, payload: { documentPath: string; absolutePath: string; content: string }) => {
      const assets = await deleteAsset(payload);
      log.info("Asset deleted:", payload.absolutePath);
      return { assets };
    },
  );

  ipcMain.handle(
    IpcChannel.AssetDeleteMany,
    async (_event, payload: { documentPath: string; absolutePaths: string[]; content: string }) => {
      const result = await deleteAssets(payload);
      log.info("Assets deleted:", result.deleted.length, "failed:", result.failed.length);
      return result;
    },
  );
}
