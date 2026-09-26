import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDuration, formatLevel, formatPaymentMethod } from "@/lib/format";

describe("format", () => {
  it("labels levels", () => {
    expect(formatLevel("INTERMEDIATE")).toBe("Intermediate");
    expect(formatLevel("custom")).toBe("custom");
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(65)).toBe("1h 05m");
    expect(formatDuration(59.6)).toBe("1h 00m");
    expect(formatDuration(-10)).toBe("0m");
  });

  it("formats dates in Nepal time", () => {
    // 20:00 UTC is 01:45 the next day in Kathmandu (UTC+5:45).
    expect(formatDate("2026-09-12T20:00:00Z")).toBe("Sep 13, 2026");
    expect(formatDateTime(new Date("2026-09-12T20:00:00Z"))).toBe("Sep 13, 2026, 1:45 AM NPT");
  });

  it("falls back for missing or invalid dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date", "n/a")).toBe("n/a");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("labels payment methods", () => {
    expect(formatPaymentMethod("ESEWA")).toBe("eSewa");
    expect(formatPaymentMethod("ESEWA", "  Office eSewa ")).toBe("Office eSewa");
    expect(formatPaymentMethod("CRYPTO")).toBe("CRYPTO");
    expect(formatPaymentMethod(null)).toBe("—");
  });
});
