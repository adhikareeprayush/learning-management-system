import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectIfSignedIn } from "@/lib/page-guards";
import { authPageHref, firstParam } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Create account" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectIfSignedIn(firstParam(params, "next"));

  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">Create account</h1>
      <p className="mt-2 text-muted">
        Create your account to start learning.{" "}
        <Link
          href={authPageHref("/login", params)}
          className="font-semibold text-brand-purple"
        >
          Sign in
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
