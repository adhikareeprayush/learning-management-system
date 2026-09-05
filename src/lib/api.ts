import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  requireTenantContext,
  TenantError,
  isOrgTeacher,
  isOrgAdmin,
  type TenantContext,
} from "@/lib/tenant";
import type { OrgRole } from "@prisma/client";
import type { OrganizationMember } from "@prisma/client";

export type AppSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireSession() {
  const session = await getServerSession();
  return session ?? null;
}

export async function handleTenantError(error: unknown) {
  if (error instanceof TenantError) {
    return jsonError(error.message, error.status);
  }
  throw error;
}

export function isTeacher(
  session: AppSession,
  member?: OrganizationMember | null,
) {
  if (member) return isOrgTeacher(member);
  return session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";
}

export async function requireTenantApi() {
  try {
    const ctx = await requireTenantContext();
    return ctx;
  } catch (error) {
    return handleTenantError(error);
  }
}

export async function requireOrgAdminApi() {
  try {
    const session = await requireSession();
    if (!session) return jsonError("Authentication required", 401);
    const ctx = await requireTenantContext();
    if (session.user.role === "ADMIN" || isOrgAdmin(ctx.member)) {
      return { ...ctx, session, member: ctx.member };
    }
    return jsonError("Admin access required", 403);
  } catch (error) {
    return handleTenantError(error);
  }
}

export async function requireTeacherApi() {
  try {
    const ctx = await requireTenantContext();
    const session = await requireSession();
    if (!session) return jsonError("Authentication required", 401);
    if (
      session.user.role === "INSTRUCTOR" ||
      session.user.role === "ADMIN" ||
      isOrgTeacher(ctx.member)
    ) {
      return { ...ctx, session };
    }
    return jsonError("Instructor access required", 403);
  } catch (error) {
    return handleTenantError(error);
  }
}

export function tenantScope(ctx: TenantContext) {
  return { organizationId: ctx.organizationId };
}

export function cleanString(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optionalString(value: unknown, max = 10_000) {
  const result = cleanString(value, max);
  return result || null;
}

export function finiteNumber(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

export function safeFileName(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9.-]+/g, "_").slice(-120);
  return cleaned || `upload-${Date.now()}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export type OrgRoleCheck = OrgRole;
