import { createLog } from "@wnote/logger/main";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol, shell } from "electron";
import { basename } from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";
import {
  IpcChannel,
  defaultLayoutState,
  type AppSettings,
  type ExportHtmlRequest,
  type ExportPdfRequest,
  type ExportPreviewRequest,
  type LayoutState,
  type ShellPathRequest,
} from "@wnote/contracts";
import {
  deleteAsset,
  deleteAssets,
  exportHtmlDocument,
  extractDocumentPathFromArgs,
  importAsset,
  openDocument,
  saveAsset,
  saveDocument,
} from "@wnote/storage-main";
import { asPdfWindow, asPreviewWindow, exportPdfDocument, openExportPreview } from "./export-pdf";
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

const log = createLog("app");

let pendingFilePath: string | null = null;

async function openFileInWindow(filePath: string, win?: BrowserWindow) {
  const target = win ?? windowManager.getFocused();
  if (!target) {
    log.info("No window available, queuing file:", filePath);
    pendingFilePath = filePath;
    return;
  }
  log.info("Opening file:", filePath);
  const data = await openDocument(filePath);
  addRecentFile(filePath);
  setLastOpenedFile(filePath);
  target.webContents.send(IpcChannel.FileOpened, data);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.warn("Another instance is running, quitting");
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    log.info("Second instance detected, argv:", argv.slice(1).join(" "));
    const filePath = extractDocumentPathFromArgs(argv.slice(1));
    if (filePath) openFileInWindow(filePath);
    const win = windowManager.getFocused();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  log.info("open-file event:", filePath);
  if (!app.isReady()) {
    pendingFilePath = filePath;
    return;
  }
  openFileInWindow(filePath);
});

ipcMain.handle(IpcChannel.SettingsGet, () => loadSettings());
ipcMain.handle(IpcChannel.SettingsSet, async (_event, partial: Partial<AppSettings>) => {
  log.info("Settings update:", Object.keys(partial).join(", "));
  const settings = await saveSettings(partial);
  if (partial.locale || partial.autoSave !== undefined) {
    for (const win of windowManager.getAll()) {
      createAppMenu(win, settings);
    }
  }
  if (partial.theme) {
    nativeTheme.themeSource = partial.theme;
    log.info("Theme changed to:", partial.theme);
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
  return openDocument(filePath);
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
  log.info("File opened via dialog:", filePath);
  const data = await openDocument(filePath);
  addRecentFile(filePath);
  setLastOpenedFile(filePath);
  const settings = await loadSettings();
  for (const w of windowManager.getAll()) createAppMenu(w, settings);
  return data;
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
    const saved = await saveDocument({ ...payload, filePath: targetPath });
    log.info("File saved:", targetPath);
    addRecentFile(targetPath);
    setLastOpenedFile(targetPath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
    return saved;
  },
);

ipcMain.handle(IpcChannel.ExportHtml, async (event, payload: ExportHtmlRequest) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, {
    defaultPath: payload.defaultName ?? "untitled.html",
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (result.canceled || !result.filePath) return null;
  const exported = await exportHtmlDocument({ ...payload, filePath: result.filePath });
  log.info("HTML exported:", exported.filePath);
  return exported;
});

ipcMain.handle(IpcChannel.ExportPdf, async (event, payload: ExportPdfRequest) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, {
    defaultPath: payload.defaultName ?? "untitled.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) return null;
  const exported = await exportPdfDocument({ ...payload, filePath: result.filePath }, (options) =>
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
  log.info("App ready, platform:", process.platform, "version:", app.getVersion());

  protocol.handle("wnote-asset", (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  const settings = await loadSettings();
  nativeTheme.themeSource = settings.theme;
  log.info("Theme:", settings.theme, "| Locale:", settings.locale);
  const win = windowManager.create();
  createAppMenu(win, settings);

  const startupFile = pendingFilePath ?? extractDocumentPathFromArgs(process.argv.slice(1));
  if (startupFile) {
    log.info("Startup file:", startupFile);
    pendingFilePath = null;
    addRecentFile(startupFile);
    setLastOpenedFile(startupFile);
  }

  app.on("activate", async () => {
    if (windowManager.count === 0) {
      log.info("Activate: creating new window");
      const s = await loadSettings();
      const newWin = windowManager.create();
      createAppMenu(newWin, s);
    }
  });
});

app.on("window-all-closed", () => {
  log.info("All windows closed");
  if (process.platform !== "darwin") app.quit();
});
