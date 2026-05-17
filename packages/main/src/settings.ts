import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { app } from "electron";
import { defaultSettings, type AppSettings } from "@wnote/shared";

const isDev = process.env.NODE_ENV === "development";

function getDataDir(): string {
  if (isDev) {
    return join(process.cwd(), ".wnote");
  }
  return join(app.getPath("home"), ".wnote");
}

function getSettingsPath(): string {
  return join(getDataDir(), "settings.json");
}

export function getDataDirectory(): string {
  return getDataDir();
}

export async function loadSettings(): Promise<AppSettings> {
  const path = getSettingsPath();
  if (!existsSync(path)) return { ...defaultSettings };
  try {
    const raw = await readFile(path, "utf-8");
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const merged = { ...current, ...partial };
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getSettingsPath(), JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
