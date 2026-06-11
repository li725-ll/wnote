import { describe, expect, it } from "vitest";
import { shouldScheduleAutoSave } from "./auto-save-state";

describe("auto-save state", () => {
  it("schedules only when auto-save is enabled and the document has a path", () => {
    expect(shouldScheduleAutoSave(true, "/docs/note.md", true)).toBe(true);
    expect(shouldScheduleAutoSave(true, "/docs/note.md", false)).toBe(false);
    expect(shouldScheduleAutoSave(true, null, true)).toBe(false);
    expect(shouldScheduleAutoSave(false, "/docs/note.md", true)).toBe(false);
    expect(shouldScheduleAutoSave(false, null, false)).toBe(false);
  });
});
