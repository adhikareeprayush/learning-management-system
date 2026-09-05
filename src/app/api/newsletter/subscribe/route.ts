import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { requireTenantApi } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const name = typeof body.name === "string" ? body.name : undefined;
    const source = typeof body.source === "string" ? body.source : "footer";

    const result = await subscribeToNewsletter({
      organizationId: tenant.organizationId,
      email,
      name,
      source,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      subscribed: true,
      alreadySubscribed: result.alreadySubscribed,
    });
  } catch (error) {
    console.error("POST /api/newsletter/subscribe", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
