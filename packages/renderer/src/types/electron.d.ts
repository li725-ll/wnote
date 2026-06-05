import type { ElectronAPI } from "@wnote/contracts";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
