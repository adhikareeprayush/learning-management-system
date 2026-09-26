/** Categories instructors can pick for a course; covers every category in the seeded catalog. */
export const COURSE_CATEGORIES = [
  "Web Development",
  "Design",
  "Digital Marketing",
  "Business",
  "Career",
  "Personal Development",
  "IT and Software",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

/** Keeps a course's current category selectable even if it predates the list (e.g. the retired "Graphic Design"). */
export function courseCategoryOptions(current?: string | null): string[] {
  const value = current?.trim();
  if (!value || (COURSE_CATEGORIES as readonly string[]).includes(value)) {
    return [...COURSE_CATEGORIES];
  }
  return [value, ...COURSE_CATEGORIES];
}
