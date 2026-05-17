#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: import.meta.dirname });
};

for (const dir of ["pkg", "pkg-node"]) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

run("wasm-pack build --release --target bundler --out-dir pkg --out-name md_parser");
run("wasm-pack build --release --target nodejs --out-dir pkg-node --out-name md_parser");

console.log("\n✓ md-parser build complete");
