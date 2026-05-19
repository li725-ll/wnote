import { createLog } from "@wnote/logger/main";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol } from "electron";
import { join, basename, extname } from "path";
import { pathToFileURL } from "url";
import { writeFile, mkdir, readFile } from "fs/promises";
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

const log = createLog("app");

const SUPPORTED_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

let pendingFilePath: string | null = null;

function extractFilePathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith("-")) continue;
    const ext = extname(arg).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext) && existsSync(arg)) return arg;
  }
  return null;
}

async function openFileInWindow(filePath: string, win?: BrowserWindow) {
  const target = win ?? windowManager.getFocused();
  if (!target) {
    log.info("No window available, queuing file:", filePath);
    pendingFilePath = filePath;
    return;
  }
  log.info("Opening file:", filePath);
  const content = await readFile(filePath, "utf-8");
  addRecentFile(filePath);
  setLastOpenedFile(filePath);
  target.webContents.send(IpcChannel.FileOpened, {
    filePath,
    name: basename(filePath),
    content,
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.warn("Another instance is running, quitting");
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    log.info("Second instance detected, argv:", argv.slice(1).join(" "));
    const filePath = extractFilePathFromArgs(argv.slice(1));
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
  const content = await readFile(filePath, "utf-8");
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
  log.info("File opened via dialog:", filePath);
  const content = await readFile(filePath, "utf-8");
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
    log.info("File saved:", targetPath);
    addRecentFile(targetPath);
    setLastOpenedFile(targetPath);
    const settings = await loadSettings();
    for (const w of windowManager.getAll()) createAppMenu(w, settings);
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
  log.info("Image saved:", filePath);
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

  const startupFile =
    pendingFilePath ?? extractFilePathFromArgs(process.argv.slice(1));
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
