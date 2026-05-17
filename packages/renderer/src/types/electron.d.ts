import type { ElectronAPI } from "@wnote/shared";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
