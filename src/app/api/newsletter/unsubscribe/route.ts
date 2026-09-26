import { NextResponse } from "next/server";
import { unsubscribeNewsletterById } from "@/lib/newsletter";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

type Params = { s: string; t: string };

async function readParams(request: Request): Promise<Params> {
  const query = new URL(request.url).searchParams;
  let s = query.get("s") ?? "";
  let t = query.get("t") ?? "";
  if (s && t) return { s, t };

  // The confirm page posts JSON; RFC 8058 one-click posts a form body and keeps s/t in the URL.
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object") {
      s ||= typeof body.s === "string" ? body.s : "";
      t ||= typeof body.t === "string" ? body.t : "";
    }
  } else if (type.includes("form")) {
    const form = await request.formData().catch(() => null);
    s ||= String(form?.get("s") ?? "");
    t ||= String(form?.get("t") ?? "");
  }
  return { s, t };
}

export async function POST(request: Request) {
  const { s, t } = await readParams(request);
  if (!verifyUnsubscribeToken(s, t)) {
    return NextResponse.json({ error: "This unsubscribe link is invalid" }, { status: 400 });
  }

  try {
    await unsubscribeNewsletterById(s);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/newsletter/unsubscribe", error);
    return NextResponse.json({ error: "Could not unsubscribe, please try again" }, { status: 500 });
  }
}

/** Link scanners prefetch GETs, so a GET only ever leads to the confirm page. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const target = new URL("/unsubscribe", request.url);
  for (const key of ["s", "t"]) {
    const value = query.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, 303);
}
