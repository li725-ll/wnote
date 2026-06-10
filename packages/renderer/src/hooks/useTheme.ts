import { useEffect } from "react";
import { applyThemeTokens, type ThemeName } from "../theme/theme-tokens";
import { useSettingsStore } from "../stores/settings-store";

type Theme = "light" | "dark" | "system";

export function applyTheme(resolved: ThemeName) {
  applyThemeTokens(document.documentElement, resolved);
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const loaded = useSettingsStore((state) => state.loaded);
  const theme = useSettingsStore((state) => state.theme);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  useEffect(() => {
    if (!loaded) return;
    if (theme !== "system") {
      applyTheme(theme);
      return;
    }
    applyTheme(getSystemTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [loaded, theme]);

  return {
    theme,
    setTheme: (nextTheme: Theme) => {
      void updateSettings({ theme: nextTheme });
    },
  };
}
