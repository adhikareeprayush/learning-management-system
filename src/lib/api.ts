import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export type AppSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireSession() {
  const session = await getServerSession();
  return session ?? null;
}

export function isTeacher(session: AppSession) {
  return session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";
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
