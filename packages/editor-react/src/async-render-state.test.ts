import { describe, expect, it } from "vitest";
import {
  errorMessage,
  errorRenderState,
  escapedTextHtml,
  idleRenderState,
  loadingRenderState,
  readyRenderState,
} from "./async-render-state";

describe("async render state", () => {
  it("creates stable state objects", () => {
    expect(idleRenderState).toEqual({ status: "idle", html: "", error: null });
    expect(loadingRenderState).toEqual({ status: "loading", html: "", error: null });
    expect(readyRenderState("<b>x</b>")).toEqual({
      status: "ready",
      html: "<b>x</b>",
      error: null,
    });
    expect(errorRenderState(new Error("Broken"), "Fallback")).toEqual({
      status: "error",
      html: "",
      error: "Broken",
    });
  });

  it("normalizes error messages", () => {
    expect(errorMessage(new Error("Render failed"), "Fallback")).toBe("Render failed");
    expect(errorMessage("Chunk failed", "Fallback")).toBe("Chunk failed");
    expect(errorMessage("", "Fallback")).toBe("Fallback");
    expect(errorMessage(null, "Fallback")).toBe("Fallback");
  });

  it("escapes fallback html", () => {
    expect(escapedTextHtml('x < y && z > "a"')).toBe('x &lt; y &amp;&amp; z &gt; "a"');
  });
});
