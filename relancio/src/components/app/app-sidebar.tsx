"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ChevronsUpDown, FlaskConical, Upload } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoMark } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { switchOrganizationAction } from "@/server/actions/organization";
import { ROLE_LABELS, type Role } from "@/lib/domain/constants";

export function AppSidebar({
  organization,
  role,
  memberships,
  followupCount,
}: {
  organization: { id: string; name: string; is_demo: boolean };
  role: Role;
  memberships: { organization: { id: string; name: string; is_demo: boolean }; role: Role }[];
  followupCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [, start] = useTransition();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label="Changer d'entreprise">
                  <LogoMark className="size-7 shrink-0" />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">{organization.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{organization.is_demo ? "Démonstration" : ROLE_LABELS[role]}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Entreprises</DropdownMenuLabel>
                {memberships.map((m) => (
                  <DropdownMenuItem
                    key={m.organization.id}
                    onSelect={() =>
                      start(async () => {
                        await switchOrganizationAction(m.organization.id);
                        router.refresh();
                      })
                    }
                  >
                    <span className="truncate">{m.organization.name}</span>
                    {m.organization.is_demo && <FlaskConical className="size-3.5 text-muted-foreground" />}
                    {m.organization.id === organization.id && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.key === "followups" && followupCount > 0 && (
                      <SidebarMenuBadge className="rounded-full bg-warning-soft px-1.5 text-[11px] text-[#A75A04]">
                        {followupCount > 99 ? "99+" : followupCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Importer des devis" isActive={pathname === "/devis/import"}>
              <Link href="/devis/import" onClick={() => setOpenMobile(false)}>
                <Upload />
                <span>Importer des devis</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

