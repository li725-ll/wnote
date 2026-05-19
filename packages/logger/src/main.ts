import log from "electron-log/main";
import { join } from "path";
import { app } from "electron";

const isDev = process.env.NODE_ENV === "development";

function getLogPath(): string {
  const base = isDev ? join(process.cwd(), ".wnote") : join(app.getPath("home"), ".wnote");
  return join(base, "logs");
}

log.initialize();

log.transports.file.resolvePathFn = (variables) => {
  return join(getLogPath(), variables.fileName ?? "main.log");
};
log.transports.file.maxSize = 5 * 1024 * 1024;

log.transports.file.format = "[{h}:{i}:{s}.{ms}] [{level}] {text}";
log.transports.console.format = "[{h}:{i}:{s}.{ms}] [{level}] {text}";

if (!isDev) {
  log.transports.console.level = false;
}

export type ScopedLog = {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

export function createLog(scope: string): ScopedLog {
  return {
    error: (...args: unknown[]) => log.error(`[${scope}]`, ...args),
    warn: (...args: unknown[]) => log.warn(`[${scope}]`, ...args),
    info: (...args: unknown[]) => log.info(`[${scope}]`, ...args),
    debug: (...args: unknown[]) => log.debug(`[${scope}]`, ...args),
  };
}

export default log;
