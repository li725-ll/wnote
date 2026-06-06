import { useEffect, useState } from "react";
import { IpcChannel, type AppSettings } from "@wnote/contracts";
import { applyThemeTokens, type ThemeName } from "../theme/theme-tokens";

type Theme = "light" | "dark" | "system";

export function applyTheme(resolved: ThemeName) {
  applyThemeTokens(document.documentElement, resolved);
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    window.electronAPI.invoke<AppSettings>(IpcChannel.SettingsGet).then((s) => {
      setTheme(s.theme);
      applyTheme(s.theme === "system" ? getSystemTheme() : s.theme);
    });
  }, []);

  useEffect(() => {
    if (theme !== "system") {
      applyTheme(theme);
      return;
    }
    applyTheme(getSystemTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}
