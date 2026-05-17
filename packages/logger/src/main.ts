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

export default log;
