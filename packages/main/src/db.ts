import Database from "better-sqlite3";
import { join } from "path";
import { app } from "electron";
import { mkdirSync } from "fs";

const isDev = process.env.NODE_ENV === "development";

function getDataDir(): string {
  if (isDev) {
    return join(process.cwd(), ".wnote");
  }
  return join(app.getPath("home"), ".wnote");
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = getDataDir();
  mkdirSync(dir, { recursive: true });
  db = new Database(join(dir, "wnote.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  return db;
}

export function kvGet<T>(key: string, fallback: T): T {
  const row = getDb().prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function kvSet<T>(key: string, value: T): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)")
    .run(key, JSON.stringify(value));
}
