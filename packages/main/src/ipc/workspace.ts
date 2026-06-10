import { existsSync } from "fs";
import { BrowserWindow, dialog, ipcMain } from "electron";
import {
  IpcChannel,
  type WorkspaceCreateDirectoryRequest,
  type WorkspaceCreateFileRequest,
  type WorkspaceDeleteRequest,
  type WorkspaceMoveRequest,
  type WorkspaceOpenRequest,
  type WorkspaceReadRequest,
  type WorkspaceRenameRequest,
} from "@wnote/contracts";
import {
  createWorkspaceDirectory,
  createWorkspaceFile,
  deleteWorkspaceEntry,
  isSupportedDocumentPath,
  moveWorkspaceEntry,
  openDocument,
  readWorkspace,
  renameWorkspaceEntry,
} from "@wnote/storage-main";
import { createAppMenu } from "../menu";
import { windowManager } from "../window-manager";
import { kvGet, kvSet } from "../db";
import { addRecentWorkspace } from "../recent-files";
import { loadSettings } from "../settings";
import { rememberOpenedFile } from "../open-file";
import type { IpcHandlerContext } from "./types";

export function registerWorkspaceIpc({ e2ePath, log }: IpcHandlerContext) {
  ipcMain.handle(IpcChannel.WorkspaceOpen, async (event, payload: WorkspaceOpenRequest = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const overridePath = e2ePath("WNOTE_E2E_WORKSPACE_PATH");
    const rootPath =
      payload.rootPath ??
      overridePath ??
      (
        await dialog.showOpenDialog(win, {
          properties: ["openDirectory"],
        })
      ).filePaths[0];
    if (!rootPath) return null;
    const workspace = await readWorkspace(rootPath);
    kvSet("workspacePath", rootPath);
    addRecentWorkspace(rootPath);
    log.info("Workspace opened:", rootPath);
    return workspace;
  });

  ipcMain.handle(IpcChannel.WorkspaceRead, async (_event, payload: WorkspaceReadRequest = {}) => {
    const rootPath = payload.rootPath ?? kvGet<string | null>("workspacePath", null);
    if (!rootPath || !existsSync(rootPath)) return null;
    return readWorkspace(rootPath);
  });

  ipcMain.handle(IpcChannel.WorkspaceFileOpen, async (_event, filePath: string) => {
    if (!filePath || !isSupportedDocumentPath(filePath)) return null;
    rememberOpenedFile(filePath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
    return openDocument(filePath);
  });

  ipcMain.handle(
    IpcChannel.WorkspaceCreateFile,
    async (_event, payload: WorkspaceCreateFileRequest) => {
      if (!payload?.rootPath) return null;
      const result = await createWorkspaceFile(payload);
      rememberOpenedFile(result.document.filePath);
      const settings = await loadSettings();
      for (const w of windowManager.getAll()) createAppMenu(w, settings);
      return result;
    },
  );

  ipcMain.handle(
    IpcChannel.WorkspaceCreateDirectory,
    async (_event, payload: WorkspaceCreateDirectoryRequest) => {
      if (!payload?.rootPath) return null;
      return createWorkspaceDirectory(payload);
    },
  );

  ipcMain.handle(IpcChannel.WorkspaceRename, async (_event, payload: WorkspaceRenameRequest) => {
    if (!payload?.rootPath || !payload.targetPath) return null;
    return renameWorkspaceEntry(payload);
  });

  ipcMain.handle(IpcChannel.WorkspaceMove, async (_event, payload: WorkspaceMoveRequest) => {
    if (!payload?.rootPath || !payload.sourcePath) return null;
    return moveWorkspaceEntry(payload);
  });

  ipcMain.handle(IpcChannel.WorkspaceDelete, async (_event, payload: WorkspaceDeleteRequest) => {
    if (!payload?.rootPath || !payload.targetPath) return null;
    return deleteWorkspaceEntry(payload);
  });
}
