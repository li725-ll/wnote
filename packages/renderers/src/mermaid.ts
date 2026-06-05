let initialized = false;
let loading: Promise<void> | null = null;
let currentTheme: "default" | "dark" | null = null;

async function ensureInit(theme: "default" | "dark") {
  if (initialized && currentTheme === theme) return;
  if (loading) {
    await loading;
    if (initialized && currentTheme === theme) return;
  }
  loading = import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme });
    initialized = true;
    currentTheme = theme;
    loading = null;
  });
  await loading;
}

export async function renderDiagram(
  source: string,
  id: string,
  theme: "default" | "dark" = "default",
): Promise<string> {
  await ensureInit(theme);
  const { default: mermaid } = await import("mermaid");
  const { svg } = await mermaid.render(`mermaid-${id}`, source);
  return svg;
}
