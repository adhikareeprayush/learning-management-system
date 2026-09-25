import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { requireAdminPage } from "@/lib/page-guards";

export default async function AdminProfilePage() {
  await requireAdminPage();
  return (
    <ProfilePageContent
      title="Profile"
      subtitle="Your admin identity and platform overview."
    />
  );
}
