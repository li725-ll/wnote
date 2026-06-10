import { ipcMain, nativeTheme } from "electron";
import {
  IpcChannel,
  defaultLayoutState,
  type AppSettings,
  type LayoutState,
} from "@wnote/contracts";
import { createAppMenu } from "../menu";
import { windowManager } from "../window-manager";
import { kvGet, kvSet } from "../db";
import { loadSettings, saveSettings } from "../settings";
import type { IpcHandlerContext } from "./types";

export function registerSettingsIpc({ log }: IpcHandlerContext) {
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
}
