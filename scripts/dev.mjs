#!/usr/bin/env node
import { spawn, execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const children = [];
const rendererPort = process.env.WNOTE_RENDERER_PORT ?? "5190";
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function spawnProcess(cmd, args, name) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      FORCE_COLOR: "1",
      WNOTE_RENDERER_PORT: rendererPort,
    },
  });
  child.stdout.on("data", (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));
  children.push(child);
  return child;
}

function cleanup() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

console.log("\n--- Building preload ---\n");
run("pnpm --filter @wnote/preload build");

console.log("\n--- Building main ---\n");
run("pnpm --filter @wnote/main build");

console.log("\n--- Starting renderer dev server ---\n");
spawnProcess("pnpm", ["--filter", "@wnote/renderer", "dev"], "renderer");

spawnProcess("pnpm", ["--filter", "@wnote/main", "dev"], "main");

console.log("\n--- Waiting for renderer dev server... ---\n");
await new Promise((resolve) => setTimeout(resolve, 2000));

console.log("\n--- Starting Electron ---\n");
const electron = spawn("npx", ["electron", "packages/main/dist/index.js", ...forwardedArgs], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_ENV: "development", WNOTE_RENDERER_PORT: rendererPort },
});
children.push(electron);

electron.on("close", () => {
  cleanup();
});
