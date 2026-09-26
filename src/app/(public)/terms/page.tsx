import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { getInstituteProfile } from "@/lib/institute";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using our courses: accounts, payments, refunds, certificates, and acceptable use.",
  alternates: { canonical: "/terms" },
};

// Static page; refreshed hourly so institute name changes appear.
export const revalidate = 3600;

const linkClass = "font-semibold text-brand-purple hover:text-brand-teal";

export default async function TermsPage() {
  const { name } = await getInstituteProfile();
  const contactLink = (
    <Link href="/contact" className={linkClass}>
      contact page
    </Link>
  );

  return (
    <LegalPage
      title="Terms of use"
      description="The rules for learning with us."
      updated="26 September 2026"
      intro={
        <p>
          These terms apply when you use {name}’s learning platform. By
          creating an account or enrolling in a course you agree to them, and
          to our{" "}
          <Link href="/privacy" className={linkClass}>
            privacy policy
          </Link>
          .
        </p>
      }
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              Give accurate details, keep your password to yourself, and use
              your account for your own learning only — accounts can’t be
              shared. You’re responsible for activity on your account. We may
              suspend accounts that break these terms.
            </p>
          ),
        },
        {
          heading: "Courses and access",
          body: (
            <p>
              Course videos and materials are for your personal learning. Don’t
              copy, record, resell, or share them. You keep access to a course
              while you’re enrolled. Instructors may update or reorganise a
              course’s content over time.
            </p>
          ),
        },
        {
          heading: "Payments",
          body: (
            <>
              <p>
                Prices are shown in Nepalese rupees (NPR) on each course page.
                Paid courses are paid for through the eSewa, Khalti, or mobile
                banking details shown when you enroll; you then upload a
                screenshot of the payment as proof.
              </p>
              <p>
                Our admins review each payment by hand, and your enrollment
                starts once the payment is verified. A payment we can’t verify
                is rejected with a reason, and you may submit new proof.
                Submitting false or edited proof may lead to your account being
                suspended.
              </p>
            </>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <p>
              To ask for a refund, reach us through our {contactLink} with the
              course and payment details. Requests are reviewed by our admins
              case by case. When a refund is approved, the payment is marked as
              refunded and your access to that course ends.
            </p>
          ),
        },
        {
          heading: "Certificates",
          body: (
            <p>
              A course certificate is issued once you complete every lesson and
              pass every quiz in the course; a roadmap certificate is issued
              once you complete every course in the roadmap. Each certificate
              has a credential ID that anyone can check on our{" "}
              <Link href="/verify" className={linkClass}>
                verification page
              </Link>
              . Certificates show that you completed our course — they are not
              a government or university qualification.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <ul>
              <li>
                Be respectful in reviews, submissions, and messages — no
                harassment, hate, or spam.
              </li>
              <li>
                Don’t try to get around payments or access controls, or
                interfere with the platform’s security.
              </li>
              <li>
                Only upload content you have the right to share, and never
                other people’s personal information.
              </li>
            </ul>
          ),
        },
        {
          heading: "Your content",
          body: (
            <p>
              Assignments, reviews, and other things you submit remain yours.
              You allow us to store and show them as needed to run your courses
              — for example so instructors can grade your work and reviews can
              appear on course pages.
            </p>
          ),
        },
        {
          heading: "Our responsibility",
          body: (
            <p>
              We work to keep courses accurate and the platform available, but
              we can’t promise it will always be uninterrupted or error-free,
              and we don’t guarantee particular results such as jobs or exam
              outcomes. Course content is educational, not professional advice.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              We may update these terms; the date at the top shows the latest
              version, and continuing to use the platform means you accept the
              changes. These terms are governed by the laws of Nepal. Questions?
              Reach us through our {contactLink}.
            </p>
          ),
        },
      ]}
    />
  );
}
