import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "@wnote/contracts";
import { IpcChannel } from "@wnote/contracts";

type Listener = (...args: unknown[]) => void;
type IpcWrappedListener = Parameters<typeof ipcRenderer.on>[1];

const listenerMap = new Map<IpcChannel, WeakMap<Listener, IpcWrappedListener>>();

function wrappedListener(channel: IpcChannel, listener: Listener): IpcWrappedListener {
  let channelListeners = listenerMap.get(channel);
  if (!channelListeners) {
    channelListeners = new WeakMap();
    listenerMap.set(channel, channelListeners);
  }

  const existing = channelListeners.get(listener);
  if (existing) return existing;

  const wrapped: IpcWrappedListener = (_event, ...args) => listener(...args);
  channelListeners.set(listener, wrapped);
  return wrapped;
}

const api: ElectronAPI = {
  platform: process.platform,
  send: (channel: IpcChannel, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>,
  on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, wrappedListener(channel, listener));
  },
  off: (channel: IpcChannel, listener: (...args: unknown[]) => void) => {
    const wrapped = listenerMap.get(channel)?.get(listener);
    if (wrapped) ipcRenderer.removeListener(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
