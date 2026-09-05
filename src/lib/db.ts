import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool?: Pool;
  databaseUrl?: string;
};

const REQUIRED_DELEGATES = [
  "certificate",
  "resourceAttempt",
  "roadmap",
  "roadmapCourse",
  "roadmapEnrollment",
  "roadmapCertificate",
  "payment",
  "paymentMethod",
  "newsletterSubscriber",
  "newsletterCampaign",
  "organization",
] as const;

function createPrismaClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
    globalForPrisma.databaseUrl = connectionString;
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function missingDelegates(client: PrismaClient) {
  return REQUIRED_DELEGATES.filter((key) => {
    const delegate = (client as unknown as Record<string, unknown>)[key];
    return !(
      typeof delegate === "object" &&
      delegate !== null &&
      typeof (delegate as { findMany?: unknown }).findMany === "function"
    );
  });
}

function disposeCached() {
  const client = globalForPrisma.prisma;
  const pool = globalForPrisma.pgPool;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  globalForPrisma.databaseUrl = undefined;
  if (client) void client.$disconnect().catch(() => undefined);
  if (pool) void pool.end().catch(() => undefined);
}

/** Recreate client when models are stale or DATABASE_URL changed. */
function getPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const cached = globalForPrisma.prisma;
  const urlChanged = globalForPrisma.databaseUrl !== connectionString;

  if (cached && !urlChanged && missingDelegates(cached).length === 0) {
    return cached;
  }

  if (cached || globalForPrisma.pgPool) {
    disposeCached();
  }

  const client = createPrismaClient(connectionString);
  const missing = missingDelegates(client);

  if (missing.length > 0) {
    throw new Error(
      `PrismaClient is missing models: ${missing.join(", ")}. Run \`pnpm db:generate\` and fully restart the Next.js dev server.`,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

/** Lazy proxy so HMR does not keep a stale PrismaClient. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
