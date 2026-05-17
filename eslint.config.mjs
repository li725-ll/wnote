// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "@eslint-react/eslint-plugin";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "**/pkg/**",
      "**/pkg-node/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["packages/main/src/**/*.ts", "packages/preload/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["packages/renderer/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ...reactPlugin.configs["recommended-type-checked"],
    languageOptions: {
      ...reactPlugin.configs["recommended-type-checked"].languageOptions,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["scripts/**/*.mjs", "packages/*/vite.config.ts", "packages/*/build.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  prettier,
);
