import { ShieldAlert } from "lucide-react";
import {
  RequestedCredentialForm,
  RequestedCredentialId,
} from "./requested-credential";

export default function CredentialNotFound() {
  return (
    <div className="bg-[#f7f8fc] pb-20">
      <div className="mx-auto max-w-2xl px-5 py-14">
        <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-brand-navy">
                Credential not found
              </h1>
              <p className="mt-2 text-sm text-muted">
                No certificate issued by this institute matches{" "}
                <RequestedCredentialId />. Check the ID printed on the
                certificate and try again.
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-black/5 pt-6">
            <RequestedCredentialForm />
          </div>
        </div>
      </div>
    </div>
  );
}
