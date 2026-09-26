import type { Metadata } from "next";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { homeForRole } from "@/lib/page-guards";
import { firstParam } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Email verification",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function failureText(error: string) {
  if (error === "TOKEN_EXPIRED") {
    return "This verification link has expired.";
  }
  if (error === "USER_NOT_FOUND") {
    return "We couldn't find an account for this verification link.";
  }
  return "This verification link is invalid.";
}

/** Landing page for every email verification link (better-auth's callbackURL). */
export default async function EmailVerifiedPage({ searchParams }: Props) {
  const error = firstParam(await searchParams, "error");
  const session = await getServerSession().catch(() => null);
  const continueHref = session ? homeForRole(session.user.role) : "/login";
  const continueLabel = session ? "Go to your dashboard" : "Sign in";
  // An old link clicked after verifying still reports an error; nothing is wrong.
  const failed = error && !session?.user.emailVerified ? error : null;

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <div className="mx-auto max-w-xl px-5 py-14">
        <div
          className={`rounded-3xl border bg-white p-6 shadow-sm md:p-8 ${failed ? "border-red-200" : "border-emerald-200"}`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-2xl ${failed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
            >
              {failed ? (
                <CircleAlert className="size-6" />
              ) : (
                <MailCheck className="size-6" />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-brand-navy">
                {failed ? "We couldn't verify your email" : "Email verified"}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {failed
                  ? `${failureText(failed)} ${
                      session
                        ? "Use “Resend email” on your dashboard to get a new link."
                        : "Sign in to get a new link."
                    }`
                  : "Your email address is confirmed. You're all set."}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-black/5 pt-6">
            <Button href={continueHref}>{continueLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
