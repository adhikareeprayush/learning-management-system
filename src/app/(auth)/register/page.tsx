import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">Create account</h1>
      <p className="mt-2 text-muted">
        Create your account to start learning.{" "}
        <Link href="/login" className="font-semibold text-brand-purple">
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
