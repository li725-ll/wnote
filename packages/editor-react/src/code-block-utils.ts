export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export const commonCodeLanguages = [
  "text",
  "ts",
  "tsx",
  "js",
  "json",
  "css",
  "html",
  "md",
] as const;

export async function copyCodeBlockText(
  text: string,
  clipboard: ClipboardLike | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard || !text) return false;
  await clipboard.writeText(text);
  return true;
}

export function normalizeCodeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized && normalized !== "text" ? normalized : null;
}

export function codeLanguageLabel(language: string | null): string {
  return language || "text";
}

export function copyButtonLabel(state: "idle" | "copied" | "failed"): string {
  if (state === "copied") return "Copied";
  if (state === "failed") return "Failed";
  return "Copy";
}
