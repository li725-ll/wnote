import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@wnote/assets": resolve(__dirname, "../assets/src/index.ts"),
      "@wnote/contracts": resolve(__dirname, "../contracts/src/index.ts"),
      "@wnote/logger/main": resolve(__dirname, "../logger/src/main.ts"),
      "@wnote/markdown": resolve(__dirname, "../markdown/src/index.ts"),
      "@wnote/renderers/katex": resolve(__dirname, "../renderers/src/katex.ts"),
      "@wnote/renderers/shiki": resolve(__dirname, "../renderers/src/shiki.ts"),
      "@wnote/storage-main": resolve(__dirname, "../storage-main/src/index.ts"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "electron",
        "better-sqlite3",
        "path",
        "fs",
        "fs/promises",
        "os",
        "url",
        "crypto",
        "http",
        "https",
        "util",
        "events",
        "child_process",
        /^node:/,
      ],
    },
  },
});
