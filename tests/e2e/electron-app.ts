import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const rendererPort = process.env.WNOTE_E2E_RENDERER_PORT ?? "5191";

const ignoredConsolePatterns = [
  /Autofill\.enable/,
  /Autofill\.setAddresses/,
  /Electron Security Warning \(Insecure Content-Security-Policy\)/,
  /This renderer process has either no Content Security Policy set/,
  /This warning will not show up once the app is packaged/,
  /Download the React DevTools/,
];

const failureConsolePatterns = [
  /Uncaught(?:\s+\w+)?:/i,
  /CodeMirror plugin crashed/i,
  /Duplicate extension names/i,
  /Invalid range for replacement decoration/i,
  /can't detect preamble/i,
  /BlockHandle.*NaN/i,
  /ImageView.*Cannot read/i,
];

export interface RunningElectronApp {
  app: ElectronApplication;
  page: Page;
  errors: string[];
  close(): Promise<void>;
}

export interface LaunchWNoteOptions {
  env?: Record<string, string>;
  fixturePath?: string;
}

export function buildElectronEntrypoints() {
  execFileSync("pnpm", ["--filter", "@wnote/preload", "build"], {
    cwd: root,
    stdio: "inherit",
  });
  execFileSync("pnpm", ["--filter", "@wnote/main", "build"], {
    cwd: root,
    stdio: "inherit",
  });
}

export async function launchWNote(
  fixturePathOrOptions?: string | LaunchWNoteOptions,
): Promise<RunningElectronApp> {
  const options =
    typeof fixturePathOrOptions === "string"
      ? { fixturePath: fixturePathOrOptions }
      : (fixturePathOrOptions ?? {});
  const renderer = spawn("pnpm", ["--filter", "@wnote/renderer", "dev"], {
    cwd: root,
    shell: true,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "development",
      FORCE_COLOR: "1",
      WNOTE_RENDERER_PORT: rendererPort,
    },
  });
  await waitForRenderer(renderer);

  const app = await electron.launch({
    args: ["packages/main/dist/index.js", ...(options.fixturePath ? [options.fixturePath] : [])],
    cwd: root,
    env: {
      ...process.env,
      ...options.env,
      NODE_ENV: "development",
      WNOTE_E2E: "1",
      WNOTE_RENDERER_PORT: rendererPort,
    },
  });
  const page = await waitForRendererWindow(app);
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;
    if (
      message.type() === "error" ||
      failureConsolePatterns.some((pattern) => pattern.test(text))
    ) {
      errors.push(text);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return {
    app,
    page,
    errors,
    async close() {
      await app.close();
      renderer.kill("SIGTERM");
    },
  };
}

export function fixture(name: string) {
  return resolve(root, "docs/qa/fixtures", name);
}

async function waitForRenderer(process: ChildProcess) {
  await new Promise<void>((resolvePromise, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Renderer dev server did not start.\n${output.slice(-2000)}`));
    }, 30_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (/Local:|ready in|http:\/\/localhost/.test(output)) {
        clearTimeout(timeout);
        resolvePromise();
      }
    };
    process.stdout?.on("data", onData);
    process.stderr?.on("data", onData);
    process.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Renderer dev server exited with code ${code}.\n${output.slice(-2000)}`));
    });
  });
}

async function waitForRendererWindow(app: ElectronApplication): Promise<Page> {
  const expectedUrl = `http://localhost:${rendererPort}`;
  for (const page of app.windows()) {
    if (page.url().startsWith(expectedUrl)) return page;
  }
  return app.waitForEvent("window", {
    predicate: (page) => page.url().startsWith(expectedUrl),
    timeout: 10_000,
  });
}
