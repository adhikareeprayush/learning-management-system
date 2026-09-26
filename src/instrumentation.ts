import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./env");
    try {
      assertServerEnv();
    } catch (error) {
      // A failed register() leaves `next start` running and failing every
      // request; exit instead so Docker/systemd surface the error. On Vercel
      // the throw already fails the invocation.
      if (!process.env.VERCEL) {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
      throw error;
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      time: new Date().toISOString(),
      method: request.method,
      // Query strings can carry reset and verification tokens.
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
      digest,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    }),
  );
};
