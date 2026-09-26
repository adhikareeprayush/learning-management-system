"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  ALL_FILTER,
  PRICE_STEP_RUPEES,
  categoryFromSlug,
  filterLevels,
  levelLabel,
  slugFromCategory,
  sortCatalogCourses,
  sortOptions,
  type CatalogApiCourse,
  type CatalogSortId,
} from "@/lib/catalog-filters";
import { formatNprFromPaisa } from "@/lib/pricing";

type CatalogCourse = CatalogApiCourse & { levelLabel: string };

function formatRating(course: CatalogCourse) {
  if (course.averageRating == null) return null;
  return `${course.averageRating.toFixed(1)} (${course.reviewCount})`;
}

export function CoursesCatalog({
  initialCourses,
}: {
  /** Rendered on the server so the listing is in the HTML; filtering is client-side. */
  initialCourses: CatalogApiCourse[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const queryParam = searchParams.get("q");

  const courses: CatalogCourse[] = initialCourses.map((course) => ({
    ...course,
    levelLabel: levelLabel(course.level),
  }));
  const [query, setQuery] = useState(() => queryParam ?? "");
  const [syncedQueryParam, setSyncedQueryParam] = useState(queryParam);
  const [level, setLevel] = useState<string>(ALL_FILTER);
  const [maxPriceRupees, setMaxPriceRupees] = useState<number | null>(null);
  const [sort, setSort] = useState<CatalogSortId>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // A new ?q= (e.g. a search submitted while already on /courses) replaces the typed query.
  if (queryParam !== syncedQueryParam) {
    setSyncedQueryParam(queryParam);
    if (queryParam != null) setQuery(queryParam);
  }

  const categoryCounts = new Map<string, number>();
  for (const course of courses) {
    if (!course.category) continue;
    categoryCounts.set(
      course.category,
      (categoryCounts.get(course.category) ?? 0) + 1,
    );
  }
  const categories = [...categoryCounts.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  // The URL is the source of truth for the category so links stay shareable.
  const category = categoryFromSlug(categoryParam, categories);

  const maxPaisa = courses.reduce(
    (max, course) => Math.max(max, course.pricePaisa),
    0,
  );
  const sliderMax = Math.max(
    PRICE_STEP_RUPEES,
    Math.ceil(maxPaisa / 100 / PRICE_STEP_RUPEES) * PRICE_STEP_RUPEES,
  );
  const priceCap =
    maxPriceRupees == null ? sliderMax : Math.min(maxPriceRupees, sliderMax);
  const priceLimited = priceCap < sliderMax;

  function selectCategory(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const slug = slugFromCategory(next);
    if (slug) params.set("category", slug);
    else params.delete("category");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  const q = query.trim().toLowerCase();
  const filtered = sortCatalogCourses(
    courses.filter((course) => {
      if (category !== ALL_FILTER && course.category !== category) return false;
      if (level !== ALL_FILTER && course.levelLabel !== level) return false;
      if (priceLimited && course.pricePaisa > priceCap * 100) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        (course.category ?? "").toLowerCase().includes(q)
      );
    }),
    sort,
  );

  const activeChips = [
    category !== ALL_FILTER ? { key: "category", label: category } : null,
    level !== ALL_FILTER ? { key: "level", label: level } : null,
    priceLimited
      ? { key: "price", label: `Up to ${formatNprFromPaisa(priceCap * 100)}` }
      : null,
    query ? { key: "query", label: `"${query}"` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  function clearFilters() {
    setQuery("");
    selectCategory(ALL_FILTER);
    setLevel(ALL_FILTER);
    setMaxPriceRupees(null);
    setSort("popular");
  }

  function removeChip(key: string) {
    if (key === "category") selectCategory(ALL_FILTER);
    if (key === "level") setLevel(ALL_FILTER);
    if (key === "price") setMaxPriceRupees(null);
    if (key === "query") setQuery("");
  }

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
          Category
        </p>
        <ul className="space-y-0.5">
          {[ALL_FILTER, ...categories].map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => selectCategory(item)}
                aria-pressed={category === item}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  category === item
                    ? "bg-brand-gradient text-white"
                    : "text-[#324361] hover:bg-surface"
                }`}
              >
                <span className="min-w-0 truncate">{item}</span>
                <span
                  className={`shrink-0 text-xs ${
                    category === item ? "text-white/80" : "text-muted"
                  }`}
                >
                  {item === ALL_FILTER
                    ? courses.length
                    : categoryCounts.get(item)}
                </span>
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
              aria-pressed={level === item}
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

      {maxPaisa > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="catalog-max-price"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal"
            >
              Max price
            </label>
            <span className="text-sm font-semibold text-brand-navy">
              {priceLimited ? formatNprFromPaisa(priceCap * 100) : "Any"}
            </span>
          </div>
          <input
            id="catalog-max-price"
            type="range"
            min={0}
            max={sliderMax}
            step={PRICE_STEP_RUPEES}
            value={priceCap}
            onChange={(e) => {
              const next = Number(e.target.value);
              setMaxPriceRupees(next >= sliderMax ? null : next);
            }}
            aria-valuetext={
              priceLimited ? formatNprFromPaisa(priceCap * 100) : "Any price"
            }
            className="w-full accent-brand-purple"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>Free</span>
            <span>{formatNprFromPaisa(sliderMax * 100)}</span>
          </div>
        </div>
      ) : null}

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
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, instructors, topics…"
            aria-label="Search courses"
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
              onChange={(e) => setSort(e.target.value as CatalogSortId)}
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
              {filtered.length} course{filtered.length === 1 ? "" : "s"}
            </h2>
            <p className="text-sm text-muted">
              Prices in Nepalese rupees (NPR).
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-purple/30 bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
              <p className="font-display text-xl text-brand-navy sm:text-2xl">
                New courses are on the way
              </p>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Nothing is published just yet. Check back soon, or explore our
                learning roadmaps in the meantime.
              </p>
              <Link
                href="/roadmaps"
                className="mt-6 inline-block text-sm font-semibold text-brand-purple hover:text-brand-teal"
              >
                View roadmaps →
              </Link>
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
                <CourseCard
                  key={course.id}
                  id={course.slug}
                  title={course.title}
                  image={course.image}
                  students={course.students}
                  duration={course.duration}
                  price={course.price}
                  category={course.category ?? undefined}
                  rating={course.averageRating}
                  reviewCount={course.reviewCount}
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {filtered.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl sm:h-28 sm:w-40 sm:shrink-0 sm:aspect-auto md:w-44">
                      <Image
                        src={course.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 176px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-teal sm:text-xs">
                        {course.category ? (
                          <>
                            <span>{course.category}</span>
                            <span className="text-black/20">·</span>
                          </>
                        ) : null}
                        <span>{course.levelLabel}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-[#324361] group-hover:text-brand-purple sm:text-base">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted sm:text-sm">
                        {course.instructor} · {course.students} ·{" "}
                        {course.duration}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        {formatRating(course) ? (
                          <>
                            <Star className="size-3.5 fill-[#f5b942] text-[#f5b942]" />
                            {formatRating(course)}
                          </>
                        ) : (
                          "No ratings yet"
                        )}
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
