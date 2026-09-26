import { describe, expect, it } from "vitest";
import {
  MIN_PAID_NPR_PAISA,
  coursePaymentAmountPaisa,
  courseRequiresPayment,
  formatCoursePrice,
  formatNprFromPaisa,
} from "@/lib/pricing";
import { minorUnitsToInput, parseCoursePriceInput } from "@/lib/course-price-input";

describe("pricing", () => {
  it("formats paisa as whole rupees", () => {
    expect(formatNprFromPaisa(149_900)).toMatch(/1,499/);
    expect(formatNprFromPaisa(149_900)).toMatch(/NPR|Rs|रू/);
  });

  it("charges priceNpr when it is at least Rs 10", () => {
    expect(MIN_PAID_NPR_PAISA).toBe(1000);
    expect(coursePaymentAmountPaisa({ priceNpr: 149_900 })).toBe(149_900);
    expect(coursePaymentAmountPaisa({ priceNpr: 1000 })).toBe(1000);
    expect(courseRequiresPayment({ priceNpr: 1000 })).toBe(true);
  });

  it("treats anything below Rs 10 as free", () => {
    for (const priceNpr of [0, 1, 999]) {
      expect(coursePaymentAmountPaisa({ priceNpr })).toBe(0);
      expect(courseRequiresPayment({ priceNpr })).toBe(false);
      expect(formatCoursePrice({ priceNpr })).toBe("Free");
    }
  });

  it("displays the charged amount for paid courses", () => {
    expect(formatCoursePrice({ priceNpr: 250_000 })).toMatch(/2,500/);
  });
});

describe("course price input", () => {
  it("converts rupees to paisa", () => {
    expect(parseCoursePriceInput("1499")).toEqual({ ok: true, priceNpr: 149_900 });
    expect(parseCoursePriceInput(" 10 ")).toEqual({ ok: true, priceNpr: 1000 });
    expect(parseCoursePriceInput("14.99")).toEqual({ ok: true, priceNpr: 1499 });
  });

  it("treats empty and zero as free", () => {
    expect(parseCoursePriceInput("")).toEqual({ ok: true, priceNpr: 0 });
    expect(parseCoursePriceInput("0")).toEqual({ ok: true, priceNpr: 0 });
  });

  it("rejects invalid, negative and below-minimum prices", () => {
    for (const value of ["abc", "-5", "Infinity", "5", "9.99"]) {
      expect(parseCoursePriceInput(value).ok, value).toBe(false);
    }
  });

  it("formats stored paisa back for the input", () => {
    expect(minorUnitsToInput(149_900)).toBe("1499");
    expect(minorUnitsToInput(1499)).toBe("14.99");
    expect(minorUnitsToInput(0)).toBe("");
  });
});
