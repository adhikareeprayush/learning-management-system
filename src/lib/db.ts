import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool?: Pool;
  prismaFingerprint?: string;
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
] as const;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Prefer a shared Pool with IPv4 — Supabase AAAA records are often unreachable
  // on local networks and cause EHOSTUNREACH refresh storms.
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 10_000,
    } as ConstructorParameters<typeof Pool>[0]);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
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

function clientFingerprint(client: PrismaClient) {
  return REQUIRED_DELEGATES.map((key) =>
    (client as unknown as Record<string, unknown>)[key] ? "1" : "0",
  ).join("");
}

/** Dev hot-reload can keep an old PrismaClient missing newer models — recreate if needed. */
function getPrismaClient() {
  const cached = globalForPrisma.prisma;

  if (cached && missingDelegates(cached).length === 0) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  const missing = missingDelegates(client);

  if (missing.length > 0) {
    throw new Error(
      `PrismaClient is missing models: ${missing.join(", ")}. Run \`pnpm db:generate\` and fully restart the Next.js dev server (Turbopack HMR cannot pick up a regenerated Prisma client).`,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaFingerprint = clientFingerprint(client);
  }

  return client;
}

/**
 * Lazy proxy so Turbopack HMR never keeps a stale PrismaClient export.
 * Every property access resolves against a validated client.
 */
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
