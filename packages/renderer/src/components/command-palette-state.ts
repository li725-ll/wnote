export type CommandPaletteNavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export interface CommandPaletteSearchable {
  label: string;
  keywords: string[];
  group: string;
  shortcut?: string;
}

export function normalizeCommandPaletteQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function commandPaletteCommandMatches(
  command: CommandPaletteSearchable,
  query: string,
): boolean {
  if (!query) return true;
  const haystack = [command.label, command.group, command.shortcut ?? "", ...command.keywords]
    .join(" ")
    .toLowerCase();
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part));
}

export function filterCommandPaletteCommands<T extends CommandPaletteSearchable>(
  commands: T[],
  query: string,
  limit = 12,
): T[] {
  const normalized = normalizeCommandPaletteQuery(query);
  return commands
    .filter((command) => commandPaletteCommandMatches(command, normalized))
    .slice(0, limit);
}

export function clampCommandPaletteSelected(selected: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  if (!Number.isFinite(selected)) return 0;
  return Math.max(0, Math.min(Math.trunc(selected), itemCount - 1));
}

export function reconcileCommandPaletteSelected({
  selected,
  itemCount,
  queryChanged,
}: {
  selected: number;
  itemCount: number;
  queryChanged: boolean;
}): number {
  if (queryChanged) return 0;
  return clampCommandPaletteSelected(selected, itemCount);
}

export function nextCommandPaletteSelected(
  selected: number,
  itemCount: number,
  key: CommandPaletteNavigationKey,
): number {
  if (itemCount <= 0) return 0;
  const current = clampCommandPaletteSelected(selected, itemCount);

  switch (key) {
    case "ArrowDown":
      return (current + 1) % itemCount;
    case "ArrowUp":
      return (current + itemCount - 1) % itemCount;
    case "Home":
      return 0;
    case "End":
      return itemCount - 1;
  }
}

export function isCommandPaletteToggleKey(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}): boolean {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k";
}
