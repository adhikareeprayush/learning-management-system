import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, studio) prefers DIRECT_URL: migrations need a session
// connection, and a transaction pooler like Supabase's :6543 breaks them.
// The app itself keeps querying through DATABASE_URL (src/lib/db.ts).
// process.env instead of env() so `prisma generate` works with neither set.
const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx seed.ts",
  },
  datasource: { url },
});
