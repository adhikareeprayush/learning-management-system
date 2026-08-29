#!/bin/sh
set -e

echo "Waiting for database..."
node <<'NODE'
const { setTimeout: sleep } = require("node:timers/promises");
const { Client } = require("pg");

async function wait() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  for (let i = 0; i < 60; i++) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      console.log("Database is ready");
      return;
    } catch {
      await client.end().catch(() => {});
      await sleep(1000);
    }
  }
  throw new Error("Database did not become ready in time");
}

wait().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

echo "Applying migrations..."
pnpm exec prisma migrate deploy

if [ "${SEED_DATABASE_ON_START:-false}" = "true" ]; then
  echo "SEED_DATABASE_ON_START=true; seeding database..."
  pnpm db:seed
else
  echo "Skipping database seed. Set SEED_DATABASE_ON_START=true to seed demo data."
fi

exec "$@"
