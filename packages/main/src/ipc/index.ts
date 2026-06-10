import { registerAssetsIpc } from "./assets";
import { registerExportIpc } from "./export";
import { registerFileIpc } from "./file";
import { registerRecentIpc } from "./recent";
import { registerSettingsIpc } from "./settings";
import { registerShellIpc } from "./shell";
import { registerWindowIpc } from "./window";
import { registerWorkspaceIpc } from "./workspace";
import type { IpcHandlerContext } from "./types";

export function registerIpcHandlers(context: IpcHandlerContext) {
  registerSettingsIpc(context);
  registerRecentIpc();
  registerWorkspaceIpc(context);
  registerFileIpc(context);
  registerExportIpc(context);
  registerShellIpc();
  registerAssetsIpc(context);
  registerWindowIpc();
}
