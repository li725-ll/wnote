import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@wnote/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@wnote/logger/main": resolve(__dirname, "../logger/src/main.ts"),
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
