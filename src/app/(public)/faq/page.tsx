import { HelpCircle } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";

const faqs = [
  {
    q: "Is this a real company selling courses?",
    a: "Edujarr is a portfolio/demo learning platform. The courses, users, and enrollments are seeded for demonstration. You can explore every flow without signing up for a paid service.",
  },
  {
    q: "Are courses self-paced?",
    a: "Yes. Lessons unlock in order within each module, but there are no live class times. Progress is saved to your account when you're logged in.",
  },
  {
    q: "How do certificates work?",
    a: "Complete every lesson in a course to earn a course certificate (PDF download from your dashboard). Finish all courses in a roadmap to earn a separate path certificate.",
  },
  {
    q: "What about paid courses?",
    a: "Some courses show NPR pricing. You'll pay via eSewa, mobile banking, or Khalti QR (details shown at enrollment), upload a payment screenshot, and an admin approves your enrollment.",
  },
  {
    q: "Can I use the demo accounts?",
    a: "Yes. alice@example.com, bob@example.com, and carol@example.com all use the password password123. Bob has completed the web intro course; Alice has finished digital marketing.",
  },
  {
    q: "Who built this?",
    a: "Edujarr was built as a full-stack showcase: Next.js, Prisma, PostgreSQL, ImageKit for media, and Better Auth. The codebase is the point — not selling seats.",
  },
];

export default function FaqPage() {
  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Help"
        title={
          <>
            Frequently asked <span className="text-brand-mint">questions</span>
          </>
        }
        description="Straight answers about how this demo platform works."
        icon={HelpCircle}
      />
      <div className="mx-auto max-w-3xl space-y-3 px-5 py-14 md:px-10">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-black/5 bg-white p-5 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none font-semibold text-[#324361]">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
