export type SlashMenuNavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function clampSlashMenuSelected(selected: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  if (!Number.isFinite(selected)) return 0;
  return Math.max(0, Math.min(Math.trunc(selected), itemCount - 1));
}

export function reconcileSlashMenuSelected({
  selected,
  itemCount,
  queryChanged,
}: {
  selected: number;
  itemCount: number;
  queryChanged: boolean;
}): number {
  if (queryChanged) return 0;
  return clampSlashMenuSelected(selected, itemCount);
}

export function nextSlashMenuSelected(
  selected: number,
  itemCount: number,
  key: SlashMenuNavigationKey,
): number {
  if (itemCount <= 0) return 0;
  const current = clampSlashMenuSelected(selected, itemCount);

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
