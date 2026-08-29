import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">Welcome back</h1>
      <p className="mt-2 text-muted">
        Login to your account to continue.{" "}
        <Link href="/register" className="font-semibold text-brand-purple">
          Create account
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
