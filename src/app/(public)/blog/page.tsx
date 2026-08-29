import Link from "next/link";
import { PenLine } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { blogPosts } from "@/lib/mock-home";

export default function BlogPage() {
  return (
    <div className="bg-[#fafbfc] pb-20">
      <PageHero
        eyebrow="Insights"
        title={
          <>
            Edujarr <span className="text-brand-mint">Blog</span>
          </>
        }
        description="Notes on learning, roadmaps, and how this demo platform works."
        icon={PenLine}
      />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-12 sm:grid-cols-2 md:px-10 lg:grid-cols-3 lg:px-16">
        {blogPosts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-brand-purple">
              {post.tag}
            </span>
            <h2 className="mt-4 font-display text-xl text-[#324361]">
              {post.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {post.excerpt}
            </p>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="text-muted">{post.date}</span>
              <Link
                href={`/blog/${post.id}`}
                className="font-semibold text-brand-teal"
              >
                Read →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
