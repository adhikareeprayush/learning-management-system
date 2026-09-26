import "dotenv/config";
import { getEmailMode, sendEmail, verifyEmailTransport } from "../src/lib/email";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: pnpm email:test <recipient@example.com>");
    process.exit(1);
  }

  console.log(`Email mode: ${getEmailMode()}`);
  const check = await verifyEmailTransport();
  if (!check.ok) {
    console.error(`Transport check failed: ${check.error}`);
    process.exit(1);
  }

  const result = await sendEmail({
    to,
    subject: "Convolution LMS test email",
    text: "If you can read this, outgoing email is configured correctly.",
    category: "test",
  });
  if (!result.ok) {
    console.error(`Send failed: ${result.error}`);
    process.exit(1);
  }
  console.log(`Sent (${result.mode})${"messageId" in result && result.messageId ? ` · ${result.messageId}` : ""}`);
}

void main();
