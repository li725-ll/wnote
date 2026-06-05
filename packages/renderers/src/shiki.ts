import type { HighlighterCore, LanguageRegistration, ThemeRegistrationRaw } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighter: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;
const loadedLanguages = new Set<string>();
const loadedThemes = new Set<string>();

type SupportedLanguage =
  | "css"
  | "html"
  | "javascript"
  | "json"
  | "jsx"
  | "markdown"
  | "sh"
  | "tsx"
  | "typescript"
  | "xml";

type SupportedTheme = "github-light" | "github-dark";

const languageLoaders: Record<SupportedLanguage, () => Promise<LanguageRegistration[]>> = {
  css: () => import("shiki/langs/css.mjs").then((module) => module.default),
  html: () => import("shiki/langs/html.mjs").then((module) => module.default),
  javascript: () => import("shiki/langs/javascript.mjs").then((module) => module.default),
  json: () => import("shiki/langs/json.mjs").then((module) => module.default),
  jsx: () => import("shiki/langs/jsx.mjs").then((module) => module.default),
  markdown: () => import("shiki/langs/markdown.mjs").then((module) => module.default),
  sh: () => import("shiki/langs/sh.mjs").then((module) => module.default),
  tsx: () => import("shiki/langs/tsx.mjs").then((module) => module.default),
  typescript: () => import("shiki/langs/typescript.mjs").then((module) => module.default),
  xml: () => import("shiki/langs/xml.mjs").then((module) => module.default),
};

const themeLoaders: Record<SupportedTheme, () => Promise<ThemeRegistrationRaw>> = {
  "github-light": () => import("shiki/themes/github-light.mjs").then((module) => module.default),
  "github-dark": () => import("shiki/themes/github-dark.mjs").then((module) => module.default),
};

const languageAliases: Record<string, SupportedLanguage> = {
  bash: "sh",
  cjs: "javascript",
  htm: "html",
  js: "javascript",
  jsonc: "json",
  md: "markdown",
  mjs: "javascript",
  shell: "sh",
  ts: "typescript",
  zsh: "sh",
};

async function getHighlighter() {
  if (highlighter) return highlighter;
  if (loading) return loading;
  loading = createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
  });
  highlighter = await loading;
  return highlighter;
}

async function ensureTheme(hl: HighlighterCore, theme: SupportedTheme) {
  if (loadedThemes.has(theme)) return;
  await hl.loadTheme(await themeLoaders[theme]());
  loadedThemes.add(theme);
}

async function ensureLanguage(hl: HighlighterCore, lang: SupportedLanguage) {
  if (loadedLanguages.has(lang)) return;
  await hl.loadLanguage(await languageLoaders[lang]());
  loadedLanguages.add(lang);
}

function normalizeLanguage(lang: string): SupportedLanguage | null {
  if (lang in languageLoaders) return lang as SupportedLanguage;
  return languageAliases[lang] ?? null;
}

export async function highlight(
  code: string,
  lang: string,
  theme: "light" | "dark",
): Promise<string> {
  const language = normalizeLanguage(lang);
  if (!language) return `<pre><code>${escapeHtml(code)}</code></pre>`;
  const hl = await getHighlighter();
  const themeName = theme === "dark" ? "github-dark" : "github-light";
  await Promise.all([ensureTheme(hl, themeName), ensureLanguage(hl, language)]);
  try {
    return hl.codeToHtml(code, { lang: language, theme: themeName });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
