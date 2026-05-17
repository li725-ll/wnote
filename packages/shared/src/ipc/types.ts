import type { IpcChannel } from "./channels";

export interface ElectronAPI {
  send: (channel: IpcChannel, ...args: unknown[]) => void;
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => void;
  off: (channel: IpcChannel, listener: (...args: unknown[]) => void) => void;
}
