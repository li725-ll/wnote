import { BrowserWindow } from "electron";
import { join } from "path";

const isDev = process.env.NODE_ENV === "development";

export interface WindowOptions {
  width?: number;
  height?: number;
  isNew?: boolean;
}

class WindowManager {
  private windows = new Map<number, BrowserWindow>();

  create(opts: WindowOptions = {}): BrowserWindow {
    const win = new BrowserWindow({
      width: opts.width ?? 1200,
      height: opts.height ?? 800,
      webPreferences: {
        preload: join(__dirname, "../../preload/dist/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.windows.set(win.id, win);

    win.on("closed", () => {
      this.windows.delete(win.id);
    });

    if (isDev) {
      win.loadURL(`http://localhost:5173${opts.isNew ? "#new" : ""}`);
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
