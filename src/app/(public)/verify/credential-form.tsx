import Form from "next/form";
import { Search } from "lucide-react";

/** GET form to /verify; the page redirects `?id=` to /verify/[credentialId]. */
export function CredentialForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form action="/verify" className="flex flex-col gap-3 sm:flex-row">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Credential ID</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          name="id"
          required
          defaultValue={defaultValue}
          placeholder="Credential ID, e.g. cmtcz0zbw000l8rp91skjsv8z"
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-4 font-mono text-sm outline-none focus:ring-2 focus:ring-brand-purple/30"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-[10px] bg-brand-gradient px-6 py-3 text-[15px] font-semibold tracking-wide text-white shadow-md shadow-brand-purple/20 transition hover:brightness-110"
      >
        Verify
      </button>
    </Form>
  );
}
