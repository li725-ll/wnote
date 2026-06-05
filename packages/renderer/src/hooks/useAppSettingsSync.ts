import { useEffect } from "react";
import { IpcChannel, type AppSettings } from "@wnote/contracts";

export function useAppSettingsSync({
  onAutoSaveChange,
  onThemeChange,
}: {
  onAutoSaveChange(autoSave: boolean): void;
  onThemeChange(theme: AppSettings["theme"]): void;
}) {
  useEffect(() => {
    window.electronAPI.invoke<AppSettings>(IpcChannel.SettingsGet).then((settings) => {
      onAutoSaveChange(settings.autoSave);
    });
  }, [onAutoSaveChange]);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const settings = args[0] as AppSettings;
      onAutoSaveChange(settings.autoSave);
      onThemeChange(settings.theme);
    };
    window.electronAPI.on(IpcChannel.SettingsChanged, handler);
    return () => window.electronAPI.off(IpcChannel.SettingsChanged, handler);
  }, [onAutoSaveChange, onThemeChange]);
}
