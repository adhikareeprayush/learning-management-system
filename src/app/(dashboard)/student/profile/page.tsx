import type { Metadata } from "next";
import { ProfilePageContent } from "@/components/profile/profile-page-content";

export const metadata: Metadata = { title: "Profile" };

export default function StudentProfilePage() {
  return (
    <ProfilePageContent
      title="Profile"
      subtitle="Your learner identity, progress, and contact details."
    />
  );
}
