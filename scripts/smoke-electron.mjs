#!/usr/bin/env node
import { execSync, spawn } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const rendererPort = process.env.WNOTE_RENDERER_PORT ?? "5190";
const fixture = process.argv[2] ?? "docs/qa/fixtures/editor-regression-sample.md";
const timeoutMs = Number(process.env.WNOTE_SMOKE_TIMEOUT_MS ?? 30_000);
const children = [];
let output = "";
let failed = false;
let sawWindow = false;
let sawStartupFile = false;
let sawOpeningFile = false;
let cleaningUp = false;

const ignoredPatterns = [
  /Autofill\.enable/,
  /Autofill\.setAddresses/,
  /NO_COLOR.*FORCE_COLOR/,
  /Electron Security Warning \(Insecure Content-Security-Policy\)/,
  /This renderer process has either no Content Security Policy set/,
  /This warning will not show up once the app is packaged/,
  /Download the React DevTools/,
];

const failurePatterns = [
  /Uncaught(?:\s+\w+)?:/i,
  /CodeMirror plugin crashed/i,
  /Duplicate extension names/i,
  /Invalid range for replacement decoration/i,
  /can't detect preamble/i,
  /BlockHandle.*NaN/i,
  /ImageView.*Cannot read/i,
];

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

function spawnProcess(command, args, name, stdio = "pipe") {
  const child = spawn(command, args, {
    cwd: root,
    shell: true,
    stdio,
    env: {
      ...process.env,
      NODE_ENV: "development",
      FORCE_COLOR: "1",
      WNOTE_RENDERER_PORT: rendererPort,
    },
  });
  children.push(child);
  if (stdio === "pipe") {
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data) => record(name, data));
    child.stderr.on("data", (data) => record(name, data));
  }
  child.on("exit", (code) => {
    if (cleaningUp) return;
    if (!finished && code !== null && code !== 0) {
      failed = true;
      finish(`Process ${name} exited with code ${code}`);
    }
  });
  return child;
}

function record(name, data) {
  const text = data.toString();
  output += text;
  process.stdout.write(`[${name}] ${text}`);

  if (/Window created id=/.test(text)) sawWindow = true;
  if (/Startup file:/.test(text) && text.includes(fixture)) sawStartupFile = true;
  if (/Opening file:/.test(text) && text.includes(fixture)) sawOpeningFile = true;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || ignoredPatterns.some((pattern) => pattern.test(line))) continue;
    if (failurePatterns.some((pattern) => pattern.test(line))) {
      failed = true;
      finish(`Unexpected Electron smoke error: ${line.trim()}`);
      return;
    }
  }

  if (sawWindow && sawStartupFile && sawOpeningFile) {
    setTimeout(() => finish(), 2_000);
  }
}

function cleanup() {
  cleaningUp = true;
  for (const child of children) {
    child.stdout?.removeAllListeners("data");
    child.stderr?.removeAllListeners("data");
    if (!child.killed) child.kill("SIGTERM");
  }
}

let finished = false;
function finish(reason) {
  if (finished) return;
  finished = true;
  cleanup();
  if (reason) {
    console.error(reason);
    process.exitCode = 1;
    return;
  }
  if (!sawWindow || !sawStartupFile || !sawOpeningFile) {
    console.error("Electron smoke did not observe startup fixture open.");
    process.exitCode = 1;
    return;
  }
  if (failed) {
    console.error("Electron smoke failed.");
    process.exitCode = 1;
    return;
  }
  console.log("Electron smoke passed.");
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

console.log("\n--- Building preload ---\n");
run("pnpm --filter @wnote/preload build");

console.log("\n--- Building main ---\n");
run("pnpm --filter @wnote/main build");

console.log("\n--- Starting renderer and main watchers ---\n");
spawnProcess("pnpm", ["--filter", "@wnote/renderer", "dev"], "renderer");
spawnProcess("pnpm", ["--filter", "@wnote/main", "dev"], "main");

await new Promise((resolve) => setTimeout(resolve, 2_000));

console.log("\n--- Starting Electron smoke ---\n");
spawnProcess("npx", ["electron", "packages/main/dist/index.js", fixture], "electron");

setTimeout(() => {
  if (!finished) {
    console.error(`Electron smoke timed out after ${timeoutMs}ms.`);
    console.error(output.slice(-4000));
    failed = true;
    finish();
  }
}, timeoutMs);
