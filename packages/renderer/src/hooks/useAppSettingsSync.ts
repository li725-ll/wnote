import { useEffect } from "react";
import { IpcChannel, type AppSettings } from "@wnote/contracts";
import { useSettingsStore } from "../stores/settings-store";

export function useAppSettingsSync({
  onAutoSaveChange,
  onThemeChange,
}: {
  onAutoSaveChange(autoSave: boolean): void;
  onThemeChange(theme: AppSettings["theme"]): void;
}) {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const setSettings = useSettingsStore((state) => state.setSettings);

  useEffect(() => {
    loadSettings().then((settings) => {
      onAutoSaveChange(settings.autoSave);
      onThemeChange(settings.theme);
    });
  }, [loadSettings, onAutoSaveChange, onThemeChange]);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const settings = args[0] as AppSettings;
      setSettings(settings);
      onAutoSaveChange(settings.autoSave);
      onThemeChange(settings.theme);
    };
    window.electronAPI.on(IpcChannel.SettingsChanged, handler);
    return () => window.electronAPI.off(IpcChannel.SettingsChanged, handler);
  }, [onAutoSaveChange, onThemeChange]);
}
