import { existsSync } from "fs";
import { kvGet, kvSet } from "./db";

const MAX_RECENT = 10;
const KV_KEY_RECENT = "recentFiles";
const KV_KEY_LAST = "lastOpenedFile";

export interface RecentFileEntry {
  path: string;
  openedAt: number;
}

export function getRecentFiles(): RecentFileEntry[] {
  return kvGet<RecentFileEntry[]>(KV_KEY_RECENT, []).filter((f) => existsSync(f.path));
}

export function addRecentFile(filePath: string): void {
  const list = kvGet<RecentFileEntry[]>(KV_KEY_RECENT, []);
  const filtered = list.filter((f) => f.path !== filePath);
  filtered.unshift({ path: filePath, openedAt: Date.now() });
  kvSet(KV_KEY_RECENT, filtered.slice(0, MAX_RECENT));
}

export function clearRecentFiles(): void {
  kvSet(KV_KEY_RECENT, []);
}

export function getLastOpenedFile(): string | null {
  return kvGet<string | null>(KV_KEY_LAST, null);
}

export function setLastOpenedFile(filePath: string | null): void {
  kvSet(KV_KEY_LAST, filePath);
}
