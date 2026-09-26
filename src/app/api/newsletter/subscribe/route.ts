import { NextResponse } from "next/server";
import { cleanString, requireTenantApi } from "@/lib/api";
import { canSendEmail } from "@/lib/email";
import { sendEmailAfterResponse } from "@/lib/email-background";
import { allowHit, hashClientIp, honeypotTripped } from "@/lib/emails/form-guard";
import { buildNewsletterWelcomeEmail, subscribeToNewsletter } from "@/lib/newsletter";

const TEN_MINUTES = 10 * 60_000;
const ONE_HOUR = 60 * 60_000;

// Same body whether the address is new, reactivated or already on the list.
const SUBSCRIBED = { subscribed: true };

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (honeypotTripped(body.website)) return NextResponse.json(SUBSCRIBED);

    const email = cleanString(body.email, 254).toLowerCase();
    const name = cleanString(body.name, 120) || undefined;
    const source = cleanString(body.source, 40) || "footer";

    const ipHash = hashClientIp(request);
    if (
      (ipHash && !allowHit(`newsletter:ip:${ipHash}`, 5, TEN_MINUTES)) ||
      (email && !allowHit(`newsletter:email:${email}`, 3, ONE_HOUR))
    ) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a few minutes." },
        { status: 429 },
      );
    }

    const result = await subscribeToNewsletter({
      organizationId: tenant.organizationId,
      email,
      name,
      source,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (!result.alreadySubscribed && canSendEmail()) {
      const subscriberId = result.subscriber.id;
      sendEmailAfterResponse(() => buildNewsletterWelcomeEmail(subscriberId));
    }

    return NextResponse.json(SUBSCRIBED);
  } catch (error) {
    console.error("POST /api/newsletter/subscribe", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
