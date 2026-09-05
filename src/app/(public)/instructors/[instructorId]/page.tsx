import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getInstructorProfile } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { resolveMediaUrl } from "@/lib/imagekit-url";

type Props = { params: Promise<{ instructorId: string }> };

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function InstructorProfilePage({ params }: Props) {
  const { instructorId } = await params;
  const ctx = await resolveTenantFromHeaders();
  if (!ctx) notFound();
  const instructor = await getInstructorProfile(instructorId, ctx.organizationId);

  if (!instructor) notFound();

  const courses = instructor.courseTeaching;

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <section className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-5 py-12 text-center md:flex-row md:px-10 md:text-left lg:px-16 lg:py-16">
          {instructor.image ? (
            <img
              src={instructor.image}
              alt=""
              className="size-28 rounded-full object-cover ring-4 ring-surface sm:size-32"
            />
          ) : (
            <span className="grid size-28 place-items-center rounded-full bg-brand-gradient text-3xl font-bold text-white ring-4 ring-surface sm:size-32">
              {instructor.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
              Instructor
            </p>
            <h1 className="mt-2 font-display text-3xl text-brand-navy md:text-4xl">
              {instructor.name}
            </h1>
            {instructor.bio ? (
              <p className="mt-3 max-w-2xl text-muted">{instructor.bio}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-[#324361] md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4 text-brand-purple" />
                {courses.length} published course{courses.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-brand-teal" />
                {courses.reduce((s, c) => s + c._count.enrollments, 0)} students
              </span>
            </div>
          </div>
          <Button href="/courses" variant="secondary" className="shrink-0">
            Browse all courses
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-16">
        <h2 className="font-display text-2xl text-brand-navy">Courses by {instructor.name.split(" ")[0]}</h2>
        {courses.length === 0 ? (
          <p className="mt-4 text-muted">No published courses yet.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-md"
              >
                <img
                  src={resolveMediaUrl(course.thumbnail)}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
                    {course.category ?? "Course"}
                  </p>
                  <h3 className="mt-1 line-clamp-2 font-semibold text-[#324361]">
                    {course.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-brand-navy">
                      {formatPrice(course.price)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Users className="size-3.5" />
                      {course._count.enrollments}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
