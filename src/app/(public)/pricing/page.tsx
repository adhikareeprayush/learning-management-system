import { LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";

const plans = [
  {
    name: "Free preview",
    price: "Rs 0",
    period: "",
    description: "First lesson in many courses is marked free — no account needed to browse.",
    perks: [
      "Catalog + roadmap browsing",
      "Free preview lessons",
      "Register to save progress",
    ],
  },
  {
    name: "Per course",
    price: "Varies",
    period: "",
    description: "Published courses list NPR pricing; students pay via eSewa, mobile banking, or Khalti QR and upload proof.",
    perks: [
      "Full module access",
      "Assignments + quizzes",
      "Course certificate on completion",
    ],
    featured: true,
  },
  {
    name: "Roadmap path",
    price: "Bundle",
    period: "",
    description: "Enroll in a path to take its courses in order and earn a path credential.",
    perks: [
      "Ordered course sequence",
      "Progress across the path",
      "Roadmap certificate",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="bg-[#fafbfc] pb-20">
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            How <span className="text-brand-mint">enrollment</span> works
          </>
        }
        description="No subscriptions — this demo uses per-course pricing and free previews."
        icon={LineChart}
      />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-14 sm:grid-cols-2 md:px-10 lg:grid-cols-3 lg:px-16">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              plan.featured
                ? "border-brand-purple bg-white shadow-md"
                : "border-black/5 bg-white"
            }`}
          >
            <h2 className="font-display text-2xl text-[#324361]">{plan.name}</h2>
            <p className="mt-3 font-display text-3xl text-brand-navy">
              {plan.price}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {plan.description}
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex gap-2">
                  <span className="text-brand-teal">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
            <Button
              href="/courses"
              className="mt-8 w-full"
              variant={plan.featured ? "primary" : "secondary"}
            >
              Browse courses
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
