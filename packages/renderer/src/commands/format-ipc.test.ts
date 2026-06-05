import { describe, expect, it } from "vitest";
import { IpcChannel } from "@wnote/contracts";
import { formatIpcCommandEntries } from "./format-ipc";

describe("format ipc commands", () => {
  it("covers every renderer format menu channel exactly once", () => {
    const expected = Object.values(IpcChannel).filter((channel) => channel.startsWith("format:"));
    const actual = formatIpcCommandEntries.map(([channel]) => channel);

    expect(actual).toHaveLength(expected.length);
    expect(new Set(actual).size).toBe(actual.length);
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it("maps channels to runnable editor commands", () => {
    for (const [, command] of formatIpcCommandEntries) {
      expect(command).toEqual(expect.any(Function));
    }
  });
});
