import { describe, expect, it } from "vitest";
import {
  clampSlashMenuSelected,
  nextSlashMenuSelected,
  reconcileSlashMenuSelected,
} from "./slash-menu-state";

describe("slash menu state", () => {
  it("clamps selected index to available items", () => {
    expect(clampSlashMenuSelected(3, 3)).toBe(2);
    expect(clampSlashMenuSelected(-2, 3)).toBe(0);
    expect(clampSlashMenuSelected(Number.NaN, 3)).toBe(0);
    expect(clampSlashMenuSelected(2, 0)).toBe(0);
  });

  it("resets selection when query changes", () => {
    expect(reconcileSlashMenuSelected({ selected: 4, itemCount: 8, queryChanged: true })).toBe(0);
    expect(reconcileSlashMenuSelected({ selected: 4, itemCount: 3, queryChanged: false })).toBe(2);
  });

  it("wraps arrow navigation", () => {
    expect(nextSlashMenuSelected(1, 3, "ArrowDown")).toBe(2);
    expect(nextSlashMenuSelected(2, 3, "ArrowDown")).toBe(0);
    expect(nextSlashMenuSelected(1, 3, "ArrowUp")).toBe(0);
    expect(nextSlashMenuSelected(0, 3, "ArrowUp")).toBe(2);
  });

  it("jumps to first and last item", () => {
    expect(nextSlashMenuSelected(2, 5, "Home")).toBe(0);
    expect(nextSlashMenuSelected(2, 5, "End")).toBe(4);
    expect(nextSlashMenuSelected(2, 0, "End")).toBe(0);
  });
});
