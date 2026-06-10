import { create } from "zustand";
import { IpcChannel, defaultSettings, type AppSettings } from "@wnote/contracts";

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  autoSave: boolean;
  theme: AppSettings["theme"];
  setSettings: (settings: AppSettings) => void;
  loadSettings: () => Promise<AppSettings>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  loaded: false,
  autoSave: defaultSettings.autoSave,
  theme: defaultSettings.theme,
  setSettings: (settings) =>
    set({ settings, loaded: true, autoSave: settings.autoSave, theme: settings.theme }),
  loadSettings: async () => {
    const settings = await window.electronAPI.invoke<AppSettings>(IpcChannel.SettingsGet);
    set({ settings, loaded: true, autoSave: settings.autoSave, theme: settings.theme });
    return settings;
  },
  updateSettings: async (partial) => {
    const settings = await window.electronAPI.invoke<AppSettings>(IpcChannel.SettingsSet, partial);
    set({ settings, loaded: true, autoSave: settings.autoSave, theme: settings.theme });
    return settings;
  },
}));
