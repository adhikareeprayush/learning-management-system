import { describe, expect, it } from "vitest";
import {
  buildOrganizationUpdate,
  parseOrganizationSettingsInput,
  readOrganizationSettings,
} from "@/app/api/admin/organization/organization-settings";

describe("readOrganizationSettings", () => {
  it("reads contact fields from settings and visual ones from branding", () => {
    expect(
      readOrganizationSettings({
        name: "Convolution LMS",
        settings: { supportEmail: "help@example.com", contactPhone: "+977 1 5550100", address: "Kathmandu" },
        branding: { primaryColor: "#04016c", logoUrl: "/images/logo.png" },
      }),
    ).toEqual({
      name: "Convolution LMS",
      supportEmail: "help@example.com",
      contactPhone: "+977 1 5550100",
      address: "Kathmandu",
      primaryColor: "#04016c",
      logoUrl: "/images/logo.png",
    });
  });

  it("tolerates missing or malformed JSON", () => {
    const values = readOrganizationSettings({ name: "X", settings: null, branding: ["bad"] });
    expect(values).toMatchObject({ supportEmail: "", contactPhone: "", primaryColor: "", logoUrl: "" });
    expect(readOrganizationSettings({ name: "X", settings: { supportEmail: 5 }, branding: {} }).supportEmail).toBe("");
  });
});

describe("parseOrganizationSettingsInput", () => {
  it("validates only the fields present and normalizes case", () => {
    expect(parseOrganizationSettingsInput({ supportEmail: " Help@Example.COM ", primaryColor: "#ABCDEF" })).toEqual({
      ok: true,
      values: { supportEmail: "help@example.com", primaryColor: "#abcdef" },
    });
  });

  it("allows clearing optional fields", () => {
    expect(parseOrganizationSettingsInput({ contactPhone: "", logoUrl: null })).toEqual({
      ok: true,
      values: { contactPhone: "", logoUrl: "" },
    });
  });

  it("reports every invalid field", () => {
    const result = parseOrganizationSettingsInput({
      name: "A",
      supportEmail: "not-an-email",
      contactPhone: "call me",
      primaryColor: "red",
      logoUrl: "javascript:alert(1)",
      address: "x".repeat(301),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["address", "contactPhone", "logoUrl", "name", "primaryColor", "supportEmail"].sort(),
      );
    }
  });

  it("rejects protocol-relative logos and non-text values", () => {
    expect(parseOrganizationSettingsInput({ logoUrl: "//evil.example/logo.png" }).ok).toBe(false);
    expect(parseOrganizationSettingsInput({ name: 42 }).ok).toBe(false);
  });

  it("treats a non-object body as an empty update", () => {
    expect(parseOrganizationSettingsInput("nope")).toEqual({ ok: true, values: {} });
  });
});

describe("buildOrganizationUpdate", () => {
  it("merges into existing JSON and removes cleared keys", () => {
    const update = buildOrganizationUpdate(
      {
        settings: { supportEmail: "old@example.com", contactPhone: "+977 1 5550100", unrelated: true },
        branding: { primaryColor: "#000000", theme: "dark" },
      },
      { name: "New Name", supportEmail: "new@example.com", contactPhone: "" },
    );
    expect(update).toEqual({
      name: "New Name",
      settings: { supportEmail: "new@example.com", unrelated: true },
      branding: { primaryColor: "#000000", theme: "dark" },
    });
  });

  it("leaves the name alone when it isn't part of the update", () => {
    expect(buildOrganizationUpdate({ settings: {}, branding: {} }, { logoUrl: "/l.png" })).not.toHaveProperty("name");
  });
});
