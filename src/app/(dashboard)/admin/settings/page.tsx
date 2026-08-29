import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  SettingsToggles,
  type SettingsToggleItem,
} from "@/components/ui/settings-toggles";
import { getServerSession } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";

const defaultToggles: SettingsToggleItem[] = [
  {
    id: "alerts",
    icon: "bell",
    label: "Critical alerts",
    description: "Immediate email for moderation and outages",
    on: true,
  },
  {
    id: "audit",
    icon: "eye",
    label: "Audit trail emails",
    description: "Daily digest of admin actions",
    on: true,
  },
  {
    id: "strict",
    icon: "shield",
    label: "Strict course review",
    description: "Require approval before publish",
    on: false,
  },
];

export default async function AdminSettingsPage() {
  const session = await getServerSession();
  const preferences = session ? await getUserPreferences(session.user.id) : {};
  const toggles = defaultToggles.map((item) => ({ ...item, on: preferences[item.id] ?? item.on }));
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle="Super admin preferences and platform policies."
      />
      <SettingsToggles items={toggles} />
    </div>
  );
}
