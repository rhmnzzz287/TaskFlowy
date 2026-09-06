import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db-schema.js";
import path from "node:path";
import fs from "node:fs";

function getDbPath() {
  // Allow override via env; default to a file inside the backend folder
  // so local dev works with zero config.
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    const p = process.env.DATABASE_URL.replace("file:", "").trim();
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
  if (process.env.DATABASE_PATH) {
    const p = process.env.DATABASE_PATH.trim();
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
  return path.join(process.cwd(), "data", "taskflowy.db");
}

// Single shared connection (tsx watch / node runtime).
let sqlite: Database.Database | undefined;
let appDb: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (appDb) return appDb;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  appDb = drizzle(sqlite, { schema });
  return appDb;
}

export const db = getDb();
export type AppDb = typeof db;
