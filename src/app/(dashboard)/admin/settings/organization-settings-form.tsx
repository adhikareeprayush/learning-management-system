"use client";

import { useState } from "react";
import { Building2, ImageOff, Loader2 } from "lucide-react";
import type {
  OrganizationSettingsField,
  OrganizationSettingsValues,
} from "@/app/api/admin/organization/organization-settings";
import { FlashBanner } from "@/components/ui/flash-banner";

type FieldErrors = Partial<Record<OrganizationSettingsField, string>>;

const inputClass =
  "h-10 w-full rounded-xl border border-black/8 bg-white px-3 text-sm outline-none transition focus:border-brand-purple/40 aria-invalid:border-red-300";

export function OrganizationSettingsForm({
  slug,
  initialValues,
}: {
  slug: string;
  initialValues: OrganizationSettingsValues;
}) {
  const [saved, setSaved] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(values) as OrganizationSettingsField[]).some(
    (key) => values[key].trim() !== saved[key],
  );
  const colorIsValid = /^#[0-9a-f]{6}$/i.test(values.primaryColor.trim());

  function update(field: OrganizationSettingsField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      const response = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: FieldErrors;
        organization?: OrganizationSettingsValues;
      };
      if (!response.ok || !data.organization) {
        if (data.fields) setFieldErrors(data.fields);
        throw new Error(data.error || "Could not save settings");
      }
      const next: OrganizationSettingsValues = {
        name: data.organization.name,
        supportEmail: data.organization.supportEmail,
        contactPhone: data.organization.contactPhone,
        address: data.organization.address,
        primaryColor: data.organization.primaryColor,
        logoUrl: data.organization.logoUrl,
      };
      setSaved(next);
      setValues(next);
      setFieldErrors({});
      setFlash("Institute settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  function fieldError(field: OrganizationSettingsField) {
    const message = fieldErrors[field];
    return message ? (
      <span id={`${field}-error`} className="mt-1 block text-xs text-red-600">
        {message}
      </span>
    ) : null;
  }

  return (
    <form
      onSubmit={save}
      noValidate
      className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-purple/12 text-brand-purple">
          <Building2 className="size-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-brand-navy sm:text-lg">Institute profile</h2>
          <p className="text-sm text-muted">
            The name appears across the public site. Contact details show on the
            contact page and in emails; branding is used for theming.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#324361]">Institute name</span>
            <input
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              required
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className={inputClass}
            />
            {fieldError("name")}
            <span className="mt-1 block text-xs text-muted">
              Slug: <span className="font-mono">{slug}</span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#324361]">Support email</span>
            <input
              type="email"
              value={values.supportEmail}
              onChange={(event) => update("supportEmail", event.target.value)}
              placeholder="support@example.com"
              aria-invalid={Boolean(fieldErrors.supportEmail)}
              aria-describedby={fieldErrors.supportEmail ? "supportEmail-error" : undefined}
              className={inputClass}
            />
            {fieldError("supportEmail")}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#324361]">Contact phone</span>
            <input
              type="tel"
              value={values.contactPhone}
              onChange={(event) => update("contactPhone", event.target.value)}
              placeholder="+977 98XXXXXXXX"
              aria-invalid={Boolean(fieldErrors.contactPhone)}
              aria-describedby={fieldErrors.contactPhone ? "contactPhone-error" : undefined}
              className={inputClass}
            />
            {fieldError("contactPhone")}
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#324361]">Address</span>
            <input
              value={values.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Street, city (shown on the contact page)"
              maxLength={300}
              autoComplete="street-address"
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={fieldErrors.address ? "address-error" : undefined}
              className={inputClass}
            />
            {fieldError("address")}
          </label>

          <div className="block">
            <label htmlFor="primaryColor" className="mb-1.5 block text-sm font-medium text-[#324361]">
              Primary colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick primary colour"
                value={colorIsValid ? values.primaryColor.trim() : "#04016c"}
                onChange={(event) => update("primaryColor", event.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-black/8 bg-white p-1"
              />
              <input
                id="primaryColor"
                value={values.primaryColor}
                onChange={(event) => update("primaryColor", event.target.value)}
                placeholder="#04016c"
                maxLength={7}
                aria-invalid={Boolean(fieldErrors.primaryColor)}
                aria-describedby={fieldErrors.primaryColor ? "primaryColor-error" : undefined}
                className={`${inputClass} font-mono`}
              />
            </div>
            {fieldError("primaryColor")}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#324361]">Logo URL</span>
            <input
              inputMode="url"
              value={values.logoUrl}
              onChange={(event) => update("logoUrl", event.target.value)}
              placeholder="https://… or /images/logo/mark.png"
              aria-invalid={Boolean(fieldErrors.logoUrl)}
              aria-describedby={fieldErrors.logoUrl ? "logoUrl-error" : undefined}
              className={inputClass}
            />
            {fieldError("logoUrl")}
          </label>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-3">
          {values.logoUrl.trim() ? (
            // Arbitrary admin-supplied URL, so next/image's host allow-list doesn't apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.logoUrl.trim()}
              alt="Logo preview"
              className="size-12 shrink-0 rounded-lg border border-black/5 bg-white object-contain p-1"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-dashed border-black/10 bg-white text-muted">
              <ImageOff className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy">{values.name || "Institute name"}</p>
            <p className="truncate text-xs text-muted">
              {[values.supportEmail, values.contactPhone].filter(Boolean).join(" · ") ||
                "No contact details yet"}
            </p>
          </div>
          {colorIsValid ? (
            <span
              className="ml-auto size-8 shrink-0 rounded-lg border border-black/10"
              style={{ backgroundColor: values.primaryColor.trim() }}
              title={values.primaryColor.trim()}
            />
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => {
              setValues(saved);
              setFieldErrors({});
            }}
            className="h-10 rounded-xl border border-black/8 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!dirty || saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-sm shadow-brand-purple/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
