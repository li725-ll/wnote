export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export async function copyCodeBlockText(
  text: string,
  clipboard: ClipboardLike | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard || !text) return false;
  await clipboard.writeText(text);
  return true;
}
