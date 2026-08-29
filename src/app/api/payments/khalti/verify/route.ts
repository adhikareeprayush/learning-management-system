import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { verifyCoursePayment } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const pidx = typeof body.pidx === "string" ? body.pidx : "";

    if (!pidx) {
      return NextResponse.json({ error: "pidx is required" }, { status: 400 });
    }

    const result = await verifyCoursePayment({
      userId: session.user.id,
      userRole: session.user.role ?? "STUDENT",
      pidx,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/payments/khalti/verify", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
