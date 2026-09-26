/** Courses are sold in NPR only; `priceNpr` (paisa) is authoritative and 0 means free. */
export const MIN_PAID_NPR_PAISA = 1000;

type Priced = { priceNpr: number };

export function formatNprFromPaisa(paisa: number) {
  const rupees = paisa / 100;
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** What the student is charged in paisa; below the paid minimum counts as free (0). */
export function coursePaymentAmountPaisa(course: Priced) {
  return course.priceNpr >= MIN_PAID_NPR_PAISA ? course.priceNpr : 0;
}

export function courseRequiresPayment(course: Priced) {
  return coursePaymentAmountPaisa(course) > 0;
}

/** Display price for a course: what the student is actually charged, in NPR. */
export function formatCoursePrice(course: Priced) {
  return courseRequiresPayment(course)
    ? formatNprFromPaisa(coursePaymentAmountPaisa(course))
    : "Free";
}
