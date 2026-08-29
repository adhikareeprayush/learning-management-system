import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  SettingsToggles,
  type SettingsToggleItem,
} from "@/components/ui/settings-toggles";
import { getServerSession } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";

const defaultToggles: SettingsToggleItem[] = [
  {
    id: "enroll",
    icon: "bell",
    label: "Enrollment alerts",
    description: "Notify when a student joins any course",
    on: true,
  },
  {
    id: "reviews",
    icon: "eye",
    label: "Review notifications",
    description: "Email when a new rating is posted",
    on: true,
  },
  {
    id: "digest",
    icon: "moon",
    label: "Weekly teaching digest",
    description: "Summary of watch time and completions",
    on: false,
  },
];

export default async function InstructorSettingsPage() {
  const session = await getServerSession();
  const preferences = session ? await getUserPreferences(session.user.id) : {};
  const toggles = defaultToggles.map((item) => ({ ...item, on: preferences[item.id] ?? item.on }));
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle="Teaching preferences and notifications."
      />
      <SettingsToggles items={toggles} />
    </div>
  );
}
