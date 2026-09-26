import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { getInstituteProfile } from "@/lib/institute";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal information we collect when you learn with us, why we need it, and the choices you have.",
  alternates: { canonical: "/privacy" },
};

// Static page; refreshed hourly so institute name changes appear.
export const revalidate = 3600;

const linkClass = "font-semibold text-brand-purple hover:text-brand-teal";

export default async function PrivacyPage() {
  const { name, supportEmail } = await getInstituteProfile();
  const contact = (
    <>
      through our{" "}
      <Link href="/contact" className={linkClass}>
        contact page
      </Link>
      {supportEmail ? (
        <>
          {" "}
          or by email at{" "}
          <a href={`mailto:${supportEmail}`} className={linkClass}>
            {supportEmail}
          </a>
        </>
      ) : null}
    </>
  );

  return (
    <LegalPage
      title="Privacy policy"
      description="What we collect, why, and the choices you have."
      updated="26 September 2026"
      intro={
        <p>
          {name} (“we”, “us”) runs this learning platform. This policy explains
          what personal information we handle when you browse, create an
          account, enroll in courses, or pay for them. If anything is unclear,
          reach us {contact}.
        </p>
      }
      sections={[
        {
          heading: "Information we collect",
          body: (
            <ul>
              <li>
                <strong className="text-[#324361]">Account details</strong> —
                your name, email address, password (stored only in hashed form),
                and, if you add them, a profile photo and bio.
              </li>
              <li>
                <strong className="text-[#324361]">Learning activity</strong> —
                enrollments, lesson progress, quiz attempts, assignment
                submissions and any files you upload with them, course reviews,
                and the certificates you earn.
              </li>
              <li>
                <strong className="text-[#324361]">Payment records</strong> —
                the course, amount, payment method you chose (eSewa, Khalti, or
                mobile banking), the payment screenshot you upload, and our
                review decision. We never receive your wallet or bank login
                details.
              </li>
              <li>
                <strong className="text-[#324361]">Messages</strong> — what
                you send through the contact form, and your newsletter
                subscription if you sign up.
              </li>
              <li>
                <strong className="text-[#324361]">Technical data</strong> —
                sign-in session cookies and basic request information such as
                IP address and browser, used for security and to prevent abuse.
              </li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul>
              <li>To give you access to courses and save your progress.</li>
              <li>To verify payments and manage enrollments and refunds.</li>
              <li>To issue certificates and let others verify them.</li>
              <li>
                To send service emails — account verification, password
                resets, and updates about your payments and certificates.
              </li>
              <li>
                To send newsletters, only if you subscribe. Every newsletter
                has an unsubscribe link.
              </li>
              <li>To keep the platform secure and working properly.</li>
            </ul>
          ),
        },
        {
          heading: "What other people can see",
          body: (
            <>
              <p>
                Course reviews show your name and profile photo next to your
                rating. Instructors see the names, emails, progress, and
                submissions of students in their courses so they can teach and
                grade.
              </p>
              <p>
                Anyone with a certificate’s credential ID can open its{" "}
                <Link href="/verify" className={linkClass}>
                  verification page
                </Link>
                , which shows the holder’s name, what was completed, and the
                issue date — never contact details.
              </p>
            </>
          ),
        },
        {
          heading: "Services we rely on",
          body: (
            <>
              <p>
                We use trusted providers to run the platform: hosting and
                database services, ImageKit for images and uploaded files, an
                email delivery service, and YouTube for lesson videos. When you
                play a lesson video, YouTube’s player loads and Google’s privacy
                policy applies to it.
              </p>
              <p>We do not sell your personal information.</p>
            </>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              We use essential cookies to keep you signed in. We don’t use
              advertising cookies. Embedded YouTube videos may set their own
              cookies when played.
            </p>
          ),
        },
        {
          heading: "How long we keep it",
          body: (
            <p>
              We keep your information while your account is active. Payment
              records and issued certificates may be kept longer where we need
              them for accounting, to answer disputes, or so certificates stay
              verifiable.
            </p>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <p>
              You can update your profile from your dashboard settings and
              unsubscribe from newsletters at any time. To access, correct, or
              delete your information, or to close your account, contact us{" "}
              {contact}.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              We may update this policy as the platform changes. The date at
              the top shows when it was last revised.
            </p>
          ),
        },
      ]}
    />
  );
}
