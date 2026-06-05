import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@wnote/assets": resolve(__dirname, "../assets/src/index.ts"),
      "@wnote/contracts": resolve(__dirname, "../contracts/src/index.ts"),
      "@wnote/markdown": resolve(__dirname, "../markdown/src/index.ts"),
      "@wnote/renderers/katex": resolve(__dirname, "../renderers/src/katex.ts"),
      "@wnote/renderers/shiki": resolve(__dirname, "../renderers/src/shiki.ts"),
      "@wnote/storage-main": resolve(__dirname, "../storage-main/src/index.ts"),
    },
  },
});
