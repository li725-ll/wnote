let initialized = false;
let loading: Promise<void> | null = null;

async function ensureInit() {
  if (initialized) return;
  if (loading) return loading;
  loading = import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, theme: "default" });
    initialized = true;
  });
  await loading;
}

export async function renderDiagram(source: string, id: string): Promise<string> {
  await ensureInit();
  const { default: mermaid } = await import("mermaid");
  const { svg } = await mermaid.render(`mermaid-${id}`, source);
  return svg;
}
