import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { getInstituteProfile } from "@/lib/institute";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How courses, payments, refunds, and certificates work — answers to common questions.",
  alternates: { canonical: "/faq" },
};

// Static page; refreshed hourly so institute name changes appear.
export const revalidate = 3600;

const linkClass = "font-semibold text-brand-purple hover:text-brand-teal";

type Faq = { q: string; a: React.ReactNode };

function faqs(name: string): Faq[] {
  const list: Faq[] = [
    {
      q: "How do the courses work?",
      a: "Courses are self-paced. Watch the video lessons, read the lesson notes and resources, take the quizzes, and submit assignments whenever it suits you — there are no fixed class times. Your progress is saved to your account.",
    },
    {
      q: "Can I try a course before enrolling?",
      a: "Many courses have free preview lessons, marked “Free preview” in the curriculum on the course page. Free courses can be joined straight away once you have an account.",
    },
    {
      q: "How do I pay for a paid course?",
      a: "Prices are in Nepalese rupees (NPR). When you enroll, we show our payment details for eSewa, Khalti, or mobile banking. Pay the amount shown, then upload a screenshot of the payment confirmation. Our team checks each payment by hand and unlocks the course once it’s verified — you’ll be notified either way.",
    },
    {
      q: "What if my payment is rejected?",
      a: (
        <>
          If we can’t match your screenshot to a payment — for example the
          amount is different or the image is unclear — we reject it and tell
          you why on the course page. You can submit a new screenshot, or{" "}
          <Link href="/contact" className={linkClass}>
            contact us
          </Link>{" "}
          if you think it’s a mistake.
        </>
      ),
    },
    {
      q: "Can I get a refund?",
      a: (
        <>
          Refund requests are reviewed by our admins case by case —{" "}
          <Link href="/contact" className={linkClass}>
            contact us
          </Link>{" "}
          with the course name and your payment details. If a refund is
          approved, the payment is marked as refunded and your access to that
          course ends. See our{" "}
          <Link href="/terms" className={linkClass}>
            terms
          </Link>{" "}
          for details.
        </>
      ),
    },
    {
      q: "How do I earn a certificate?",
      a: "Complete every lesson in a course and pass all of its quizzes. Your certificate is issued automatically and can be downloaded as a PDF from your dashboard. Finish every course in a roadmap to earn a roadmap certificate as well.",
    },
    {
      q: "How can someone check that my certificate is genuine?",
      a: (
        <>
          Every certificate carries a credential ID. Anyone can enter it on
          our{" "}
          <Link href="/verify" className={linkClass}>
            verification page
          </Link>{" "}
          to see the holder’s name, what they completed, and when it was
          issued. No contact details are shown.
        </>
      ),
    },
    {
      q: "How long do I keep access to a course?",
      a: "You can keep learning and revisiting lessons for as long as you’re enrolled. Access to a paid course only ends if its payment is refunded.",
    },
    {
      q: "I forgot my password. What should I do?",
      a: (
        <>
          Use{" "}
          <Link href="/forgot-password" className={linkClass}>
            Forgot password
          </Link>{" "}
          on the login page and we’ll email you a link to set a new one.
        </>
      ),
    },
    {
      q: `How do I contact ${name}?`,
      a: (
        <>
          Send us a message through the{" "}
          <Link href="/contact" className={linkClass}>
            contact page
          </Link>{" "}
          — it’s the quickest way to reach us about courses, payments, or
          certificates.
        </>
      ),
    },
  ];

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    list.push({
      q: "Is there a demo account I can use?",
      a: "Yes — this is a demo site. Sign in as alice@example.com, bob@example.com, or carol@example.com with the password password123.",
    });
  }

  return list;
}

export default async function FaqPage() {
  const { name } = await getInstituteProfile();

  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Help"
        title={
          <>
            Frequently asked <span className="text-brand-mint">questions</span>
          </>
        }
        description="How courses, payments, and certificates work."
        icon={HelpCircle}
      />
      <div className="mx-auto max-w-3xl space-y-3 px-5 py-14 md:px-10">
        {faqs(name).map((item) => (
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
        <p className="pt-6 text-center text-sm text-muted">
          Still have a question?{" "}
          <Link href="/contact" className={linkClass}>
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
