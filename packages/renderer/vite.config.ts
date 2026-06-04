import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "path";

const devPort = Number(process.env.WNOTE_RENDERER_PORT ?? 5190);

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  base: "./",
  resolve: {
    alias: {
      "@wnote/ui": resolve(__dirname, "../ui/src/index.ts"),
      "@wnote/logger/renderer": resolve(__dirname, "../logger/src/renderer.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: devPort,
    strictPort: true,
  },
});
