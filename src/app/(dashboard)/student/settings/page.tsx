import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  SettingsToggles,
  type SettingsToggleItem,
} from "@/components/ui/settings-toggles";
import { getServerSession } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";

const defaultToggles: SettingsToggleItem[] = [
  {
    id: "email",
    icon: "bell",
    label: "Assignment reminders",
    description: "Email when deadlines are within 48 hours",
    on: true,
  },
  {
    id: "digest",
    icon: "eye",
    label: "Weekly digest",
    description: "Summary of progress every Monday",
    on: true,
  },
  {
    id: "theme",
    icon: "moon",
    label: "Compact density",
    description: "Tighter spacing on dashboard tables",
    on: false,
  },
];

export default async function StudentSettingsPage() {
  const session = await getServerSession();
  const preferences = session ? await getUserPreferences(session.user.id) : {};
  const toggles = defaultToggles.map((item) => ({
    ...item,
    on: preferences[item.id] ?? item.on,
  }));
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle="Preferences for notifications and display."
      />
      <SettingsToggles items={toggles} />
    </div>
  );
}
