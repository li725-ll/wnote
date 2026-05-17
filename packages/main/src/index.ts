import log from "@wnote/logger/main";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol } from "electron";
import { join } from "path";
import { pathToFileURL } from "url";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import {
  IpcChannel,
  defaultLayoutState,
  type AppSettings,
  type LayoutState,
} from "@wnote/shared";
import { createAppMenu } from "./menu";
import { windowManager } from "./window-manager";
import { kvGet, kvSet } from "./db";
import {
  getRecentFiles,
  clearRecentFiles,
  getLastOpenedFile,
  addRecentFile,
  setLastOpenedFile,
} from "./recent-files";
import { loadSettings, saveSettings, getDataDirectory } from "./settings";

ipcMain.handle(IpcChannel.SettingsGet, () => loadSettings());
ipcMain.handle(IpcChannel.SettingsSet, async (_event, partial: Partial<AppSettings>) => {
  const settings = await saveSettings(partial);
  if (partial.locale || partial.autoSave !== undefined) {
    for (const win of windowManager.getAll()) {
      createAppMenu(win, settings);
    }
  }
  if (partial.theme) {
    nativeTheme.themeSource = partial.theme;
  }
  return settings;
});

ipcMain.handle(IpcChannel.LayoutGet, () => {
  return kvGet<LayoutState>("layout", defaultLayoutState);
});

ipcMain.handle(IpcChannel.LayoutSet, (_event, partial: Partial<LayoutState>) => {
  const current = kvGet<LayoutState>("layout", defaultLayoutState);
  const merged = { ...current, ...partial };
  kvSet("layout", merged);
  return merged;
});

ipcMain.handle(IpcChannel.RecentFilesGet, () => getRecentFiles());
ipcMain.handle(IpcChannel.RecentFilesClear, async () => {
  clearRecentFiles();
  const settings = await loadSettings();
  for (const w of windowManager.getAll()) createAppMenu(w, settings);
});

ipcMain.handle(IpcChannel.LastOpenedFileGet, async () => {
  const filePath = getLastOpenedFile();
  if (!filePath || !existsSync(filePath)) return null;
  const { readFile } = await import("fs/promises");
  const content = await readFile(filePath, "utf-8");
  const { basename } = await import("path");
  return { filePath, name: basename(filePath), content };
});

ipcMain.handle(IpcChannel.FileOpen, async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const { readFile } = await import("fs/promises");
  const content = await readFile(filePath, "utf-8");
  const { basename } = await import("path");
  addRecentFile(filePath);
  setLastOpenedFile(filePath);
  const settings = await loadSettings();
  for (const w of windowManager.getAll()) createAppMenu(w, settings);
  return { filePath, name: basename(filePath), content };
});

ipcMain.handle(
  IpcChannel.FileSave,
  async (event, payload: { filePath?: string; content: string; defaultName?: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    let targetPath = payload.filePath;
    if (!targetPath) {
      const result = await dialog.showSaveDialog(win, {
        defaultPath: payload.defaultName ?? "untitled.md",
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (result.canceled || !result.filePath) return null;
      targetPath = result.filePath;
    }
    await writeFile(targetPath, payload.content, "utf-8");
    addRecentFile(targetPath);
    setLastOpenedFile(targetPath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
    const { basename } = await import("path");
    return { filePath: targetPath, name: basename(targetPath) };
  },
);

ipcMain.handle(IpcChannel.ImageSave, async (_event, payload: { buffer: ArrayBuffer; ext: string }) => {
  const dataDir = getDataDirectory();
  const imgDir = join(dataDir, "images");
  await mkdir(imgDir, { recursive: true });
  const fileName = `${randomUUID()}.${payload.ext}`;
  const filePath = join(imgDir, fileName);
  await writeFile(filePath, Buffer.from(payload.buffer));
  return filePath;
});

// 窗口控制
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

protocol.registerSchemesAsPrivileged([
  {
    scheme: "wnote-asset",
    privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true },
  },
]);

app.whenReady().then(async () => {
  log.info("App ready");

  protocol.handle("wnote-asset", (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  const settings = await loadSettings();
  nativeTheme.themeSource = settings.theme;
  const win = windowManager.create();
  createAppMenu(win, settings);

  app.on("activate", async () => {
    if (windowManager.count === 0) {
      const s = await loadSettings();
      const newWin = windowManager.create();
      createAppMenu(newWin, s);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
