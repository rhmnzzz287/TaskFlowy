import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // Must match src/db.ts default.
    url: process.env.DATABASE_URL ?? "file:./data/taskflowy.db",
  },
} satisfies Config;
