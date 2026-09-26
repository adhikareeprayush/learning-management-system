"use client";

import { usePathname } from "next/navigation";
import { CredentialForm } from "../credential-form";

/** not-found.tsx gets no params, so the missing ID is read back from the URL. */
function useRequestedId() {
  const segment = usePathname().split("/").filter(Boolean)[1] ?? "";
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

export function RequestedCredentialId() {
  const credentialId = useRequestedId();
  return (
    <code className="break-all rounded bg-surface px-1.5 py-0.5 font-mono text-[13px] text-brand-navy">
      {credentialId || "(empty)"}
    </code>
  );
}

export function RequestedCredentialForm() {
  const credentialId = useRequestedId();
  return <CredentialForm key={credentialId} defaultValue={credentialId} />;
}
