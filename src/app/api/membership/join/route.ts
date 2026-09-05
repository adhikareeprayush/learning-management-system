import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { ensureStudentMembership } from "@/lib/membership";
import { requireTenantContext, TenantError } from "@/lib/tenant";
import { handleTenantError, jsonError } from "@/lib/api";

/** Join the default institute (idempotent). */
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return jsonError("Authentication required", 401);
    }

    const ctx = await requireTenantContext();
    const result = await ensureStudentMembership(
      ctx.organizationId,
      session.user.id,
    );

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      memberRole: result.member.role,
    });
  } catch (error) {
    if (error instanceof TenantError) {
      return handleTenantError(error);
    }
    throw error;
  }
}
