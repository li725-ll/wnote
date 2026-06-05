import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import markdown from "shiki/langs/markdown.mjs";
import sh from "shiki/langs/sh.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

let highlighter: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;

const supportedLanguages = new Set([
  "css",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "sh",
  "tsx",
  "typescript",
  "xml",
]);

async function getHighlighter() {
  if (highlighter) return highlighter;
  if (loading) return loading;
  loading = createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [css, html, javascript, json, jsx, markdown, sh, tsx, typescript, xml],
    engine: createJavaScriptRegexEngine(),
  });
  highlighter = await loading;
  return highlighter;
}

export async function highlight(
  code: string,
  lang: string,
  theme: "light" | "dark",
): Promise<string> {
  if (!supportedLanguages.has(lang)) return `<pre><code>${escapeHtml(code)}</code></pre>`;
  const hl = await getHighlighter();
  const themeName = theme === "dark" ? "github-dark" : "github-light";
  try {
    return hl.codeToHtml(code, { lang, theme: themeName });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
