import Link from "next/link";

type CourseCardProps = {
  id: string;
  title: string;
  image: string;
  students: string;
  duration: string;
  price: string;
  category?: string;
  date?: string;
  rating?: number;
};

export function CourseCard({
  id,
  title,
  image,
  students,
  duration,
  price,
  category,
  rating,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:border-brand-purple/15 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface">
        <img
          src={image}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        {category ? (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-brand-navy shadow-sm">
            {category}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[#324361] group-hover:text-brand-navy">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{duration}</span>
          <span aria-hidden>·</span>
          <span>{students}</span>
          {typeof rating === "number" && rating > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-[#c9a227]">
                {"★".repeat(rating)}
                <span className="text-black/10">
                  {"★".repeat(Math.max(0, 5 - rating))}
                </span>
              </span>
            </>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
          <span className="text-lg font-semibold text-brand-navy">{price}</span>
          <span className="text-sm font-semibold text-brand-purple group-hover:text-brand-teal">
            View course →
          </span>
        </div>
      </div>
    </Link>
  );
}
