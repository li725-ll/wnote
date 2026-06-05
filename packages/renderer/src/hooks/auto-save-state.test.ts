import { describe, expect, it } from "vitest";
import { shouldScheduleAutoSave } from "./auto-save-state";

describe("auto-save state", () => {
  it("schedules only when auto-save is enabled and the document has a path", () => {
    expect(shouldScheduleAutoSave(true, "/docs/note.md")).toBe(true);
    expect(shouldScheduleAutoSave(true, null)).toBe(false);
    expect(shouldScheduleAutoSave(false, "/docs/note.md")).toBe(false);
    expect(shouldScheduleAutoSave(false, null)).toBe(false);
  });
});
