import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { getServerSession } from "@/lib/auth";
import { getProfileBundle } from "@/lib/profile-data";

type Props = {
  title?: string;
  subtitle?: string;
};

export async function ProfilePageContent({
  title = "Profile",
  subtitle = "Your identity, stats, and account details.",
}: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const bundle = await getProfileBundle(session.user.id, session.user.role ?? "STUDENT");
  if (!bundle) redirect("/login");

  const { user, extended, stats, activity } = bundle;
  const assignmentsDue =
    "assignmentsDue" in bundle ? bundle.assignmentsDue : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader title={title} subtitle={subtitle} />
      <ProfileEditor
        initialProfile={{
          name: user.name,
          email: user.email,
          image: user.image ?? "",
          bio: user.bio ?? "",
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }}
        extended={extended}
        stats={stats}
        activity={activity}
        assignmentsDue={assignmentsDue}
      />
    </div>
  );
}
