export const requiredThemeTokens = [
  "--color-bg",
  "--color-text",
  "--color-muted",
  "--color-border",
  "--color-hover-bg",
  "--color-focus-ring",
  "--color-accent",
  "--color-link",
  "--color-code-bg",
  "--color-blockquote-border",
  "--color-placeholder",
  "--color-danger",
  "--color-table-border",
  "--color-table-header-bg",
  "--sidebar-bg",
  "--sidebar-border",
  "--editor-max-width",
  "--editor-font",
  "--editor-font-size",
  "--editor-line-height",
  "--editor-mono-font",
] as const;

export type ThemeToken = (typeof requiredThemeTokens)[number];

export const themeNames = ["light", "dark"] as const;

export type ThemeName = (typeof themeNames)[number];

export const tableThemeTokens = [
  "--color-table-border",
  "--color-table-header-bg",
] as const satisfies readonly ThemeToken[];

export const themeTokenValues: Record<ThemeName, Record<ThemeToken, string>> = {
  light: {
    "--color-bg": "#fff8ef",
    "--color-text": "#2a241d",
    "--color-muted": "#786b5d",
    "--color-border": "#e4d2bc",
    "--color-hover-bg": "#f2e4d2",
    "--color-focus-ring": "#9a7442",
    "--color-accent": "#9a7442",
    "--color-link": "#815d2e",
    "--color-code-bg": "#f0dfcb",
    "--color-blockquote-border": "#c7a77f",
    "--color-placeholder": "#a99783",
    "--color-danger": "#b84a3a",
    "--color-table-border": "#d8bea0",
    "--color-table-header-bg": "#efe0cd",
    "--sidebar-bg": "#f1e4d2",
    "--sidebar-border": "#dcc7ad",
    "--editor-max-width": "800px",
    "--editor-font":
      '"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif',
    "--editor-font-size": "16px",
    "--editor-line-height": "1.72",
    "--editor-mono-font":
      '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  dark: {
    "--color-bg": "#17120d",
    "--color-text": "#f0e4d5",
    "--color-muted": "#b09c84",
    "--color-border": "#463929",
    "--color-hover-bg": "#2a2118",
    "--color-focus-ring": "#d0a766",
    "--color-accent": "#d0a766",
    "--color-link": "#dfb972",
    "--color-code-bg": "#261d15",
    "--color-blockquote-border": "#68543a",
    "--color-placeholder": "#8a7660",
    "--color-danger": "#e07a67",
    "--color-table-border": "#4e3f2d",
    "--color-table-header-bg": "#241b13",
    "--sidebar-bg": "#100d0a",
    "--sidebar-border": "#3c3022",
    "--editor-max-width": "800px",
    "--editor-font":
      '"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif',
    "--editor-font-size": "16px",
    "--editor-line-height": "1.72",
    "--editor-mono-font":
      '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
};

export function applyThemeTokens(target: HTMLElement, theme: ThemeName) {
  target.setAttribute("data-theme", theme);
  const values = themeTokenValues[theme];
  for (const token of requiredThemeTokens) {
    target.style.setProperty(token, values[token]);
  }
}
