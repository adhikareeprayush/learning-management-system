import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { blogPosts } from "@/lib/mock-home";

type Props = { params: Promise<{ slug: string }> };

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.id === slug);
  if (!post) notFound();

  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow={post.tag}
        title={post.title}
        description={`${post.date} · ${post.excerpt}`}
        icon={PenLine}
      />
      <article className="mx-auto max-w-3xl space-y-5 px-5 py-14 text-lg leading-relaxed text-muted md:px-10">
        {post.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
        <Link href="/blog" className="inline-block font-semibold text-brand-teal">
          ← Back to blog
        </Link>
      </article>
    </div>
  );
}
