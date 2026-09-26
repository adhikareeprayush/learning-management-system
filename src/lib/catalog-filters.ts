import { formatLevel } from "@/lib/format";

/** Shape returned by GET /api/courses — shared by the route and the catalog UI. */
export type CatalogApiCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  image: string;
  instructor: string;
  instructorId: string;
  level: string;
  /** Display price in NPR (or "Free") — what the student is charged. */
  price: string;
  /** Amount charged in paisa; 0 for free courses. */
  pricePaisa: number;
  duration: string;
  students: string;
  studentCount: number;
  lessonCount: number;
  featured: boolean;
  outcomes: string[];
  /** Null when the course has no reviews yet. */
  averageRating: number | null;
  reviewCount: number;
  createdAt: string;
};

export const ALL_FILTER = "All";

export const filterLevels = [
  ALL_FILTER,
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const sortOptions = [
  { id: "popular", label: "Most popular" },
  { id: "rating", label: "Highest rated" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "newest", label: "Newest" },
] as const;

export type CatalogSortId = (typeof sortOptions)[number]["id"];

/** Rupee granularity of the max-price slider. */
export const PRICE_STEP_RUPEES = 100;

/** Level enum → display label; matches the `filterLevels` names. */
export const levelLabel = formatLevel;

export function slugFromCategory(category: string) {
  if (category === ALL_FILTER) return null;
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve a `?category=` value against the categories that actually exist. */
export function categoryFromSlug(
  slug: string | null | undefined,
  categories: readonly string[],
) {
  if (!slug) return ALL_FILTER;
  const decoded = decodeURIComponent(slug).trim();
  const exact = categories.find((category) => category === decoded);
  if (exact) return exact;
  const normalized = slugFromCategory(decoded);
  return (
    categories.find((category) => slugFromCategory(category) === normalized) ??
    ALL_FILTER
  );
}

export function sortCatalogCourses<
  T extends Pick<
    CatalogApiCourse,
    "studentCount" | "averageRating" | "reviewCount" | "pricePaisa" | "createdAt"
  >,
>(list: readonly T[], sort: CatalogSortId): T[] {
  const next = [...list];
  switch (sort) {
    case "rating":
      return next.sort(
        (a, b) =>
          (b.averageRating ?? -1) - (a.averageRating ?? -1) ||
          b.reviewCount - a.reviewCount,
      );
    case "price-asc":
      return next.sort((a, b) => a.pricePaisa - b.pricePaisa);
    case "price-desc":
      return next.sort((a, b) => b.pricePaisa - a.pricePaisa);
    case "newest":
      return next.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
    default:
      return next.sort((a, b) => b.studentCount - a.studentCount);
  }
}
