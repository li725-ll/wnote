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
    "--color-bg": "#ffffff",
    "--color-text": "#1f2328",
    "--color-muted": "#57606a",
    "--color-border": "#d0d7de",
    "--color-hover-bg": "#f6f8fa",
    "--color-focus-ring": "#2563eb",
    "--color-accent": "#2563eb",
    "--color-link": "#0969da",
    "--color-code-bg": "#f6f8fa",
    "--color-blockquote-border": "#d0d7de",
    "--color-placeholder": "#8c959f",
    "--color-danger": "#cf222e",
    "--color-table-border": "#d0d7de",
    "--color-table-header-bg": "#f6f8fa",
    "--sidebar-bg": "#f6f8fa",
    "--sidebar-border": "#d0d7de",
    "--editor-mono-font":
      '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  dark: {
    "--color-bg": "#0d1117",
    "--color-text": "#e6edf3",
    "--color-muted": "#8b949e",
    "--color-border": "#30363d",
    "--color-hover-bg": "#161b22",
    "--color-focus-ring": "#2f81f7",
    "--color-accent": "#58a6ff",
    "--color-link": "#58a6ff",
    "--color-code-bg": "#161b22",
    "--color-blockquote-border": "#30363d",
    "--color-placeholder": "#6e7681",
    "--color-danger": "#ff7b72",
    "--color-table-border": "#30363d",
    "--color-table-header-bg": "#161b22",
    "--sidebar-bg": "#010409",
    "--sidebar-border": "#30363d",
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
