import { after } from "next/server";
import { sendEmail, type OutgoingEmail } from "@/lib/email";

/**
 * Builds and sends an email after the response is returned, so a slow or
 * failing mail server never delays or breaks the request that triggered it.
 */
export function sendEmailAfterResponse(
  build: () => Promise<OutgoingEmail | OutgoingEmail[] | null>,
) {
  const task = async () => {
    try {
      const built = await build();
      const messages = Array.isArray(built) ? built : built ? [built] : [];
      for (const message of messages) {
        const result = await sendEmail(message);
        if (!result.ok && result.error !== "suppressed") {
          console.error(`[email] ${message.category} to ${message.to} failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("[email]", error);
    }
  };

  try {
    after(task);
  } catch {
    // Outside a request (scripts, seed): just run it.
    void task();
  }
}
