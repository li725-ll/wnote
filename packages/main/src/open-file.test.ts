import { EventEmitter } from "events";
import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vitest";
import { IpcChannel } from "@wnote/contracts";
import { waitForWindowContent } from "./open-file";

interface MockWindow {
  isDestroyed(): boolean;
  webContents: EventEmitter & {
    isLoading(): boolean;
    send: ReturnType<typeof vi.fn>;
  };
}

describe("open file helpers", () => {
  it("waits for loading windows before sending file data", async () => {
    vi.useFakeTimers();
    const win = mockWindow({ loading: true });

    const done = vi.fn();
    void waitForWindowContent(asBrowserWindow(win)).then(done);

    await vi.advanceTimersByTimeAsync(100);
    expect(done).not.toHaveBeenCalled();

    win.webContents.emit("did-finish-load");
    await vi.runAllTimersAsync();
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("does not wait for windows that are already loaded", async () => {
    const win = mockWindow({ loading: false });

    await expect(waitForWindowContent(asBrowserWindow(win))).resolves.toBeUndefined();
    expect(win.webContents.listenerCount("did-finish-load")).toBe(0);
  });

  it("falls back when a loading window never finishes", async () => {
    vi.useFakeTimers();
    const win = mockWindow({ loading: true });

    const done = vi.fn();
    void waitForWindowContent(asBrowserWindow(win)).then(done);

    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toHaveBeenCalledOnce();
    expect(win.webContents.listenerCount("did-finish-load")).toBe(0);
    expect(win.webContents.listenerCount("did-fail-load")).toBe(0);
    vi.useRealTimers();
  });
});

function mockWindow({ loading }: { loading: boolean }): MockWindow {
  const webContents = Object.assign(new EventEmitter(), {
    isLoading: () => loading,
    send: vi.fn((channel: IpcChannel, data: unknown) => ({ channel, data })),
  });

  return {
    isDestroyed: () => false,
    webContents,
  };
}

function asBrowserWindow(win: MockWindow): BrowserWindow {
  return win as unknown as BrowserWindow;
}
