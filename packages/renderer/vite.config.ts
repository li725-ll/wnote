import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "path";
import { rendererContentSecurityPolicy } from "./src/security/csp";

const devPort = Number(process.env.WNOTE_RENDERER_PORT ?? 5190);

export default defineConfig(({ mode }) => ({
  plugins: [
    htmlCsp(rendererContentSecurityPolicy({ dev: mode === "development", devPort })),
    react(),
    wasm(),
    topLevelAwait(),
  ],
  base: "./",
  resolve: {
    alias: {
      "@wnote/assets": resolve(__dirname, "../assets/src/index.ts"),
      "@wnote/contracts": resolve(__dirname, "../contracts/src/index.ts"),
      "@wnote/document": resolve(__dirname, "../document/src/index.ts"),
      "@wnote/editor-react": resolve(__dirname, "../editor-react/src/index.tsx"),
      "@wnote/markdown": resolve(__dirname, "../markdown/src/index.ts"),
      "@wnote/renderers/katex": resolve(__dirname, "../renderers/src/katex.ts"),
      "@wnote/renderers/mermaid": resolve(__dirname, "../renderers/src/mermaid.ts"),
      "@wnote/renderers/shiki": resolve(__dirname, "../renderers/src/shiki.ts"),
      "@wnote/renderers": resolve(__dirname, "../renderers/src/index.ts"),
      "@wnote/logger/renderer": resolve(__dirname, "../logger/src/renderer.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("/@tiptap/") || id.includes("/prosemirror-")) {
            return "vendor-tiptap";
          }
          if (id.includes("/katex/")) {
            return "vendor-katex";
          }
          if (
            id.includes("/unified/") ||
            id.includes("/remark-") ||
            id.includes("/mdast-") ||
            id.includes("/hast-") ||
            id.includes("/micromark") ||
            id.includes("/unist-") ||
            id.includes("/property-information") ||
            id.includes("/space-separated-tokens") ||
            id.includes("/comma-separated-tokens")
          ) {
            return "vendor-markdown";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: devPort,
    strictPort: true,
  },
}));

function htmlCsp(content: string) {
  return {
    name: "wnote-html-csp",
    transformIndexHtml(html: string) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${content}" />`,
      );
    },
  };
}
