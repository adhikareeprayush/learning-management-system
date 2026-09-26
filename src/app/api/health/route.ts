import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Driver errors for a dropped connection can have an empty message.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as { code?: unknown }).code;
  const detail = error.message || (typeof code === "string" ? code : "") || error.name;
  return error.cause ? `${detail} (${describeError(error.cause)})` : detail;
}

/** Liveness + database reachability for load balancers and Docker HEALTHCHECK. */
export async function GET() {
  let db: "ok" | "error" = "ok";
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
  } catch (error) {
    db = "error";
    console.error("[health] database check failed:", describeError(error));
  }

  const ok = db === "ok";
  return Response.json(
    { ok, db, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
