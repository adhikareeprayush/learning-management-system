import { Suspense } from "react";
import KhaltiReturnClient from "./khalti-return-client";

export default function KhaltiReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
          <p className="text-sm text-[#5c6b82]">Confirming your payment…</p>
        </main>
      }
    >
      <KhaltiReturnClient />
    </Suspense>
  );
}
