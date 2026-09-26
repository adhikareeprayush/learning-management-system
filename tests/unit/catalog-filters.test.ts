import { describe, expect, it } from "vitest";
import {
  ALL_FILTER,
  categoryFromSlug,
  levelLabel,
  slugFromCategory,
  sortCatalogCourses,
} from "@/lib/catalog-filters";

describe("category slugs", () => {
  it("slugifies category names", () => {
    expect(slugFromCategory("Web Development")).toBe("web-development");
    expect(slugFromCategory("Design & UX")).toBe("design-ux");
    expect(slugFromCategory(ALL_FILTER)).toBeNull();
  });

  it("resolves ?category= against existing categories", () => {
    const categories = ["Web Development", "Design & UX", "Marketing"];
    expect(categoryFromSlug("design-ux", categories)).toBe("Design & UX");
    expect(categoryFromSlug("Marketing", categories)).toBe("Marketing");
    expect(categoryFromSlug("Web%20Development", categories)).toBe("Web Development");
    expect(categoryFromSlug("unknown", categories)).toBe(ALL_FILTER);
    expect(categoryFromSlug(null, categories)).toBe(ALL_FILTER);
  });
});

describe("levelLabel", () => {
  it("maps level enums to labels", () => {
    expect(levelLabel("BEGINNER")).toBe("Beginner");
    expect(levelLabel("ADVANCED")).toBe("Advanced");
    expect(levelLabel("OTHER")).toBe("OTHER");
  });
});

describe("sortCatalogCourses", () => {
  const courses = [
    { id: "a", studentCount: 5, averageRating: 4.5, reviewCount: 2, pricePaisa: 200_000, createdAt: "2026-01-01T00:00:00Z" },
    { id: "b", studentCount: 50, averageRating: null, reviewCount: 0, pricePaisa: 0, createdAt: "2026-03-01T00:00:00Z" },
    { id: "c", studentCount: 20, averageRating: 4.5, reviewCount: 9, pricePaisa: 100_000, createdAt: "2026-02-01T00:00:00Z" },
  ];
  const ids = (list: typeof courses) => list.map((course) => course.id);

  it("sorts by each option", () => {
    expect(ids(sortCatalogCourses(courses, "popular"))).toEqual(["b", "c", "a"]);
    expect(ids(sortCatalogCourses(courses, "rating"))).toEqual(["c", "a", "b"]);
    expect(ids(sortCatalogCourses(courses, "price-asc"))).toEqual(["b", "c", "a"]);
    expect(ids(sortCatalogCourses(courses, "price-desc"))).toEqual(["a", "c", "b"]);
    expect(ids(sortCatalogCourses(courses, "newest"))).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    sortCatalogCourses(courses, "price-desc");
    expect(ids(courses)).toEqual(["a", "b", "c"]);
  });
});
