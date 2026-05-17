import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "@wnote/shared";
import { IpcChannel } from "@wnote/shared";

const api: ElectronAPI = {
  send: (channel: IpcChannel, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>,
  on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  off: (channel: IpcChannel, listener: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
