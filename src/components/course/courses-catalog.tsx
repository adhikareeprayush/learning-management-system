"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import {
  categoryFromSlug,
  filterCategories,
  filterLevels,
  slugFromCategory,
  sortOptions,
  type CatalogCourse,
} from "@/lib/mock-courses";

type SortId = (typeof sortOptions)[number]["id"];

type ApiCourse = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  image: string;
  instructor: string;
  level: string;
  price: string;
  priceValue: number;
  duration: string;
  students: string;
  studentCount: number;
  featured?: boolean;
};

function toCatalogCourse(course: ApiCourse): CatalogCourse {
  const level =
    course.level === "BEGINNER"
      ? "Beginner"
      : course.level === "INTERMEDIATE"
        ? "Intermediate"
        : course.level === "ADVANCED"
          ? "Advanced"
          : ((["Beginner", "Intermediate", "Advanced"].includes(course.level)
              ? course.level
              : "Beginner") as CatalogCourse["level"]);

  return {
    id: course.slug || course.id,
    title: course.title,
    image: course.image,
    students: course.students,
    studentCount: course.studentCount,
    duration: course.duration,
    price: course.price,
    priceValue: course.priceValue,
    category: course.category ?? "Course",
    level,
    rating: 5,
    instructor: course.instructor,
    date: "01/01/2026",
    featured: course.featured,
  };
}

function sortCourses(list: CatalogCourse[], sort: SortId) {
  const next = [...list];
  switch (sort) {
    case "rating":
      return next.sort((a, b) => b.rating - a.rating);
    case "price-asc":
      return next.sort((a, b) => a.priceValue - b.priceValue);
    case "price-desc":
      return next.sort((a, b) => b.priceValue - a.priceValue);
    case "newest":
      return next;
    default:
      return next.sort((a, b) => b.studentCount - a.studentCount);
  }
}

export function CoursesCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const queryParam = searchParams.get("q");

  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(() => queryParam ?? "");
  const [category, setCategory] = useState<string>(() =>
    categoryFromSlug(categoryParam),
  );
  const [level, setLevel] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState(100);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortId>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load courses");
        if (!cancelled) {
          setCourses((data.courses as ApiCourse[]).map(toCatalogCourse));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCategory(categoryFromSlug(categoryParam));
  }, [categoryParam]);

  useEffect(() => {
    if (queryParam != null) setQuery(queryParam);
  }, [queryParam]);

  function selectCategory(next: string) {
    setCategory(next);
    const params = new URLSearchParams(searchParams.toString());
    const slug = slugFromCategory(next);
    if (slug) params.set("category", slug);
    else params.delete("category");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter((course) => {
      if (category !== "All" && course.category !== category) return false;
      if (level !== "All" && course.level !== level) return false;
      if (course.priceValue > maxPrice) return false;
      if (course.rating < minRating) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q)
      );
    });
    return sortCourses(list, sort);
  }, [courses, query, category, level, maxPrice, minRating, sort]);

  const activeChips = [
    category !== "All" ? { key: "category", label: category } : null,
    level !== "All" ? { key: "level", label: level } : null,
    maxPrice < 100 ? { key: "price", label: `Under $${maxPrice}` } : null,
    minRating > 0 ? { key: "rating", label: `${minRating}+ stars` } : null,
    query ? { key: "query", label: `"${query}"` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  function clearFilters() {
    setQuery("");
    selectCategory("All");
    setLevel("All");
    setMaxPrice(100);
    setMinRating(0);
    setSort("popular");
  }

  function removeChip(key: string) {
    if (key === "category") selectCategory("All");
    if (key === "level") setLevel("All");
    if (key === "price") setMaxPrice(100);
    if (key === "rating") setMinRating(0);
    if (key === "query") setQuery("");
  }

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
          Category
        </p>
        <ul className="space-y-0.5">
          {filterCategories.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => selectCategory(item)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  category === item
                    ? "bg-brand-gradient text-white"
                    : "text-[#324361] hover:bg-surface"
                }`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
          Level
        </p>
        <div className="flex flex-wrap gap-2">
          {filterLevels.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setLevel(item)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                level === item
                  ? "bg-brand-navy text-white"
                  : "bg-surface text-[#324361] hover:bg-brand-purple/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
            Max price
          </p>
          <span className="text-sm font-semibold text-brand-navy">${maxPrice}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand-purple"
        />
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="text-sm font-semibold text-brand-purple hover:text-brand-teal"
      >
        Reset all filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 md:px-10 lg:px-16 lg:py-14">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:gap-4">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted sm:left-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, instructors, topics…"
            className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-[15px] outline-none ring-brand-purple focus:ring-2 sm:py-3.5 sm:pl-12"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-[#324361] sm:flex-none sm:px-4 sm:py-3 lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
          <label className="inline-flex min-w-0 flex-[2] items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm sm:flex-none">
            <span className="shrink-0 text-muted">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="min-w-0 flex-1 bg-transparent font-semibold text-[#324361] outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto inline-flex rounded-xl border border-black/10 bg-white p-1 sm:ml-0">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setView("grid")}
              className={`rounded-lg p-2 ${
                view === "grid" ? "bg-brand-gradient text-white" : "text-muted"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setView("list")}
              className={`rounded-lg p-2 ${
                view === "list" ? "bg-brand-gradient text-white" : "text-muted"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6">
          {activeChips.map((chip) => (
            <button
              type="button"
              key={chip.key}
              onClick={() => removeChip(chip.key)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3.5 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden h-fit rounded-3xl border border-black/5 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:block xl:p-6">
          <h2 className="mb-5 font-display text-xl text-brand-navy">Filters</h2>
          {filterPanel}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 sm:mb-5">
            <h2 className="font-display text-xl text-[#323232] sm:text-2xl">
              {loading
                ? "Loading…"
                : `${filtered.length} course${filtered.length === 1 ? "" : "s"}`}
            </h2>
            <p className="text-sm text-muted">
              Live catalog from the database.
            </p>
            {loadError ? (
              <p className="mt-2 text-sm text-red-600">{loadError}</p>
            ) : null}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-black/5 bg-white px-4 py-12 text-center text-sm text-muted">
              Loading courses…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-purple/30 bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
              <p className="font-display text-xl text-brand-navy sm:text-2xl">
                No matches
              </p>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Try clearing a filter or search term.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 text-sm font-semibold text-brand-purple"
              >
                Clear filters
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {filtered.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                  >
                    <img
                      src={course.image}
                      alt=""
                      className="aspect-[16/10] w-full rounded-xl object-cover sm:h-28 sm:w-40 sm:shrink-0 sm:aspect-auto md:w-44"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-teal sm:text-xs">
                        <span>{course.category}</span>
                        <span className="text-black/20">·</span>
                        <span>{course.level}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-[#324361] group-hover:text-brand-purple sm:text-base">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted sm:text-sm">
                        {course.instructor} · {course.students} ·{" "}
                        {course.duration}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-black/5 pt-3 sm:block sm:shrink-0 sm:border-0 sm:pt-0 sm:text-right">
                      <p className="text-base font-semibold text-brand-navy sm:text-lg">
                        {course.price}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-brand-navy/40"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 p-4">
              <h2 className="font-display text-xl text-brand-navy">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg border border-black/10 p-2"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filterPanel}</div>
            <div className="border-t border-black/5 p-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-xl bg-brand-gradient py-3 text-sm font-semibold text-white"
              >
                Show {filtered.length} courses
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
