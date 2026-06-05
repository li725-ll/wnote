export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["main", "preload", "renderer", "ui", "deps", "config", "release"]],
    "scope-case": [2, "always", "lower-case"],
  },
};
