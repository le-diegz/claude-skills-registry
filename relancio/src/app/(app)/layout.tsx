import { cookies } from "next/headers";
import { requireAppContext } from "@/lib/auth/context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { MobileNav } from "@/components/app/mobile-nav";
import { DemoBanner } from "@/components/app/demo-banner";
import { QuoteDialogProvider } from "@/components/quotes/quote-dialog-provider";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireAppContext();
  const [{ count: followupCount }, { count: unread }] = await Promise.all([
    ctx.supabase
      .from("followup_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id)
      .in("status", ["pending_approval", "to_prepare", "approved", "failed"]),
    ctx.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id)
      .eq("user_id", ctx.user.id)
      .is("read_at", null),
  ]);
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <TooltipProvider delayDuration={300}>
      <QuoteDialogProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar
            organization={{ id: ctx.organization.id, name: ctx.organization.name, is_demo: ctx.organization.is_demo }}
            role={ctx.role}
            memberships={ctx.memberships}
            followupCount={followupCount ?? 0}
          />
          <SidebarInset className="min-w-0">
            {ctx.organization.is_demo && <DemoBanner />}
            <AppHeader userName={ctx.profile.full_name ?? ""} userEmail={ctx.user.email} unread={unread ?? 0} />
            <main id="contenu" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <MobileNav followupCount={followupCount ?? 0} />
      </QuoteDialogProvider>
    </TooltipProvider>
  );
}
