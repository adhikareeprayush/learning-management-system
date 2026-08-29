import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { getInstructorsFromDb } from "@/lib/dashboard-data";

export default async function InstructorsPage() {
  const instructors = await getInstructorsFromDb();

  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="People"
        title={
          <>
            Our <span className="text-brand-mint">instructors</span>
          </>
        }
        description="Instructors from the seeded catalog — Jane teaches the web track."
        icon={GraduationCap}
      />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 md:px-10 lg:px-16">
        {instructors.length === 0 ? (
          <p className="col-span-full text-center text-muted">
            Instructors will appear here once they join the platform.
          </p>
        ) : (
          instructors.map((person) => (
            <article
              key={person.id}
              className="rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm transition hover:border-brand-purple/20 hover:shadow-md"
            >
              {person.image ? (
                <img
                  src={person.image}
                  alt=""
                  className="mx-auto size-24 rounded-full object-cover"
                />
              ) : (
                <span className="mx-auto grid size-24 place-items-center rounded-full bg-brand-gradient text-2xl font-bold text-white">
                  {person.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
              <h2 className="mt-4 font-semibold text-[#324361]">{person.name}</h2>
              <p className="text-sm text-muted line-clamp-2">
                {person.bio ?? "Instructor"}
              </p>
              <p className="mt-2 text-xs font-semibold text-brand-teal">
                {person._count.courseTeaching} course
                {person._count.courseTeaching === 1 ? "" : "s"}
              </p>
              <Link
                href={`/instructors/${person.id}`}
                className="mt-4 inline-block text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
              >
                View profile →
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
