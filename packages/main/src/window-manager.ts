import { BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import { join } from "path";
import { createLog } from "@wnote/logger/main";

const log = createLog("window");
const isDev = process.env.NODE_ENV === "development";
const rendererDevPort = process.env.WNOTE_RENDERER_PORT ?? "5190";

export interface WindowOptions {
  width?: number;
  height?: number;
  isNew?: boolean;
}

export function mainWindowOptions(opts: WindowOptions = {}): BrowserWindowConstructorOptions {
  return {
    width: opts.width ?? 1200,
    height: opts.height ?? 800,
    webPreferences: {
      preload: join(__dirname, "../../preload/dist/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}

class WindowManager {
  private windows = new Map<number, BrowserWindow>();

  create(opts: WindowOptions = {}): BrowserWindow {
    const win = new BrowserWindow(mainWindowOptions(opts));

    this.windows.set(win.id, win);
    log.info(`Window created id=${win.id} (total: ${this.windows.size})`);

    win.on("closed", () => {
      this.windows.delete(win.id);
      log.info(`Window closed id=${win.id} (total: ${this.windows.size})`);
    });

    if (isDev) {
      win.loadURL(`http://localhost:${rendererDevPort}${opts.isNew ? "#new" : ""}`);
      win.webContents.openDevTools();
    } else {
      win.loadFile(join(__dirname, "../../renderer/dist/index.html"), {
        hash: opts.isNew ? "new" : undefined,
      });
    }

    return win;
  }

  get(id: number): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  getAll(): BrowserWindow[] {
    return [...this.windows.values()];
  }

  getFocused(): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() ?? this.getAll()[0] ?? undefined;
  }

  close(id: number): void {
    this.windows.get(id)?.close();
  }

  get count(): number {
    return this.windows.size;
  }
}

export const windowManager = new WindowManager();
