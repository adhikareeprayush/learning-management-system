import type { Organization, Prisma } from "@prisma/client";
import { parseMediaUrl } from "@/lib/media-url";

/** Editable institute profile. Contact fields live in Organization.settings, visual ones in Organization.branding. */
export type OrganizationSettingsValues = {
  name: string;
  supportEmail: string;
  contactPhone: string;
  /** Postal/office address shown on the contact page. */
  address: string;
  primaryColor: string;
  logoUrl: string;
};

export type OrganizationSettingsField = keyof OrganizationSettingsValues;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s()-]{6,20}$/;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function asObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function stringField(source: Record<string, Prisma.JsonValue>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function readOrganizationSettings(
  org: Pick<Organization, "name" | "settings" | "branding">,
): OrganizationSettingsValues {
  const settings = asObject(org.settings);
  const branding = asObject(org.branding);
  return {
    name: org.name,
    supportEmail: stringField(settings, "supportEmail"),
    contactPhone: stringField(settings, "contactPhone"),
    address: stringField(settings, "address"),
    primaryColor: stringField(branding, "primaryColor"),
    logoUrl: stringField(branding, "logoUrl"),
  };
}

const validators: Record<OrganizationSettingsField, (value: string) => string | null> = {
  name: (value) =>
    value.length < 2 || value.length > 120 ? "Name must be 2–120 characters." : null,
  supportEmail: (value) =>
    value && (value.length > 254 || !EMAIL_RE.test(value)) ? "Enter a valid email address." : null,
  contactPhone: (value) =>
    value && (!PHONE_RE.test(value) || value.replace(/\D/g, "").length < 6)
      ? "Enter a valid phone number (digits, spaces, +, -, parentheses)."
      : null,
  address: (value) =>
    value.length > 300 ? "Keep the address under 300 characters." : null,
  primaryColor: (value) =>
    value && !HEX_COLOR_RE.test(value) ? "Use a 6-digit hex colour like #04016c." : null,
  // Only uploaded or bundled images: the CSP and image optimizer block other hosts.
  logoUrl: (value) => {
    if (!value) return null;
    const parsed = parseMediaUrl(value, "image");
    return parsed.ok ? null : "Upload the logo here (or use a /images/… path) instead of linking another site.";
  },
};

export type ParsedOrganizationSettings =
  | { ok: true; values: Partial<OrganizationSettingsValues> }
  | { ok: false; errors: Partial<Record<OrganizationSettingsField, string>> };

/** Validates only the fields present in `body`, so PATCH can update a subset. */
export function parseOrganizationSettingsInput(body: unknown): ParsedOrganizationSettings {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const values: Partial<OrganizationSettingsValues> = {};
  const errors: Partial<Record<OrganizationSettingsField, string>> = {};

  for (const field of Object.keys(validators) as OrganizationSettingsField[]) {
    if (!(field in input)) continue;
    const raw = input[field];
    if (raw !== null && typeof raw !== "string") {
      errors[field] = "Must be text.";
      continue;
    }
    let value = (raw ?? "").trim();
    if (field === "supportEmail" || field === "primaryColor") value = value.toLowerCase();
    const error = validators[field](value);
    if (error) errors[field] = error;
    else values[field] = value;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}

/** Merges into the existing JSON so keys this form doesn't manage survive. */
export function buildOrganizationUpdate(
  org: Pick<Organization, "settings" | "branding">,
  values: Partial<OrganizationSettingsValues>,
): Prisma.OrganizationUpdateInput {
  const settings = { ...asObject(org.settings) };
  const branding = { ...asObject(org.branding) };

  const assign = (target: Record<string, Prisma.JsonValue>, key: string, value?: string) => {
    if (value === undefined) return;
    if (value) target[key] = value;
    else delete target[key];
  };

  assign(settings, "supportEmail", values.supportEmail);
  assign(settings, "contactPhone", values.contactPhone);
  assign(settings, "address", values.address);
  assign(branding, "primaryColor", values.primaryColor);
  assign(branding, "logoUrl", values.logoUrl);

  return {
    ...(values.name !== undefined ? { name: values.name } : {}),
    settings: settings as Prisma.InputJsonObject,
    branding: branding as Prisma.InputJsonObject,
  };
}
