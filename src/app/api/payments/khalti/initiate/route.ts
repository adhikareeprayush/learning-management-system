import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { initiateCoursePayment } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const courseId = typeof body.courseId === "string" ? body.courseId : "";

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const result = await initiateCoursePayment({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      courseId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      pidx: result.pidx,
      courseSlug: result.courseSlug,
    });
  } catch (error) {
    console.error("POST /api/payments/khalti/initiate", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
