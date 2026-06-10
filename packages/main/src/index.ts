import { createLog } from "@wnote/logger/main";
import { app, BrowserWindow, nativeTheme, net, protocol } from "electron";
import { pathToFileURL } from "url";
import { extractDocumentPathFromArgs } from "@wnote/storage-main";
import { createAppMenu } from "./menu";
import { windowManager } from "./window-manager";
import { loadSettings } from "./settings";
import { openFileInWindow as sendFileToWindow, rememberOpenedFile } from "./open-file";
import { registerIpcHandlers } from "./ipc";

if (process.platform === "win32") {
  app.commandLine.appendSwitch(
    "enable-features",
    "OverlayScrollbar,OverlayScrollbarFlashAfterAnyScrollUpdate,OverlayScrollbarFlashWhenMouseEnter",
  );
  app.disableDomainBlockingFor3DAPIs(); // 禁用3D API的域名阻塞
  app.disableHardwareAcceleration(); // 禁用硬件加速 （issue: 解决圆角白角）
}

const log = createLog("app");
const isE2E = process.env.WNOTE_E2E === "1";

let pendingFilePath: string | null = null;

function e2ePath(name: string): string | null {
  if (!isE2E) return null;
  return process.env[name] ?? null;
}

async function openFileInWindow(filePath: string, win?: BrowserWindow) {
  const target = win ?? windowManager.getFocused();
  if (!target) {
    log.info("No window available, queuing file:", filePath);
    pendingFilePath = filePath;
    return;
  }
  log.info("Opening file:", filePath);
  await sendFileToWindow(target, filePath);
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

registerIpcHandlers({ e2ePath, log });

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
    rememberOpenedFile(startupFile);
    await openFileInWindow(startupFile, win);
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
