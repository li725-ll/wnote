export type AsyncRenderState =
  | { status: "idle"; html: ""; error: null }
  | { status: "loading"; html: ""; error: null }
  | { status: "ready"; html: string; error: null }
  | { status: "error"; html: ""; error: string };

export const idleRenderState: AsyncRenderState = { status: "idle", html: "", error: null };
export const loadingRenderState: AsyncRenderState = {
  status: "loading",
  html: "",
  error: null,
};

export function readyRenderState(html: string): AsyncRenderState {
  return { status: "ready", html, error: null };
}

export function errorRenderState(reason: unknown, fallbackMessage: string): AsyncRenderState {
  return {
    status: "error",
    html: "",
    error: errorMessage(reason, fallbackMessage),
  };
}

export function errorMessage(reason: unknown, fallbackMessage: string): string {
  if (reason instanceof Error && reason.message.trim()) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason;
  return fallbackMessage;
}

export function escapedTextHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
