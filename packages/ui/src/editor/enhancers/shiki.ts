import type { BundledLanguage, BundledTheme, HighlighterGeneric } from "shiki";

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null;
let loading: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null;

async function getHighlighter() {
  if (highlighter) return highlighter;
  if (loading) return loading;
  loading = import("shiki").then(({ createHighlighter }) =>
    createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [],
    }),
  );
  highlighter = await loading;
  return highlighter;
}

export async function highlight(
  code: string,
  lang: string,
  theme: "light" | "dark",
): Promise<string> {
  const hl = await getHighlighter();
  const themeName = theme === "dark" ? "github-dark" : "github-light";
  try {
    const loadedLangs = hl.getLoadedLanguages();
    if (!loadedLangs.includes(lang as BundledLanguage)) {
      await hl.loadLanguage(lang as BundledLanguage);
    }
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
  return hl.codeToHtml(code, { lang, theme: themeName });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
