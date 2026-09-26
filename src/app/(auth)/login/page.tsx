import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getEmailBranding } from "@/lib/email-layout";
import { redirectIfSignedIn } from "@/lib/page-guards";
import { authPageHref, firstParam } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectIfSignedIn(firstParam(params, "next"));
  const { supportEmail } = await getEmailBranding();

  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">Welcome back</h1>
      <p className="mt-2 text-muted">
        Login to your account to continue.{" "}
        <Link
          href={authPageHref("/register", params)}
          className="font-semibold text-brand-purple"
        >
          Create account
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <LoginForm supportEmail={supportEmail} />
        </Suspense>
      </div>
    </div>
  );
}
