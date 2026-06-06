import { describe, expect, it } from "vitest";
import { writingFocusState } from "./writing-focus-state";

describe("writingFocusState", () => {
  it("marks focused writing state from editor focus", () => {
    expect(
      writingFocusState({
        editorFocused: true,
        gutterActive: false,
        menuOpen: false,
      }),
    ).toEqual({
      focused: true,
      toolsVisible: false,
    });
  });

  it("shows tools when gutter or menus are active", () => {
    expect(
      writingFocusState({
        editorFocused: true,
        gutterActive: true,
        menuOpen: false,
      }).toolsVisible,
    ).toBe(true);
    expect(
      writingFocusState({
        editorFocused: false,
        gutterActive: false,
        menuOpen: true,
      }).toolsVisible,
    ).toBe(true);
  });
});
