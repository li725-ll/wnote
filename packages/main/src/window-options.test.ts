import { describe, expect, it } from "vitest";
import { mainWindowOptions } from "./window-manager";

describe("main window options", () => {
  it("keeps renderer windows isolated from node", () => {
    expect(mainWindowOptions({ width: 1000, height: 700 })).toMatchObject({
      width: 1000,
      height: 700,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
  });
});
