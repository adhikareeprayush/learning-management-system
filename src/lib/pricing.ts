export function formatNprFromPaisa(paisa: number) {
  const rupees = paisa / 100;
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function coursePaymentAmountPaisa(course: { price: number; priceNpr: number }) {
  if (course.priceNpr >= 1000) return course.priceNpr;
  if (course.price > 0) {
    return Math.max(1000, Math.round((course.price / 100) * 135 * 100));
  }
  return 0;
}

export function courseRequiresPayment(course: { price: number; priceNpr: number }) {
  return coursePaymentAmountPaisa(course) >= 1000;
}

/** Display price for a course: what the student is actually charged, in NPR. */
export function formatCoursePrice(course: { price: number; priceNpr: number }) {
  return courseRequiresPayment(course)
    ? formatNprFromPaisa(coursePaymentAmountPaisa(course))
    : "Free";
}
