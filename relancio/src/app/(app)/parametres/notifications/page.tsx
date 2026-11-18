import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { SettingsSection } from "@/components/settings/section";
import { NotificationPrefs } from "@/components/settings/profile-forms";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  const ctx = await requireAppContext();
  return (
    <SettingsSection title="Notifications" description="Choisissez ce qui vous est signalé dans le centre de notifications.">
      <NotificationPrefs initial={{ notify_followups: ctx.profile.notify_followups, notify_imports: ctx.profile.notify_imports, notify_failures: ctx.profile.notify_failures }} />
    </SettingsSection>
  );
}
