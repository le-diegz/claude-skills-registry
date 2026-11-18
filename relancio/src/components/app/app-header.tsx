"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";
import { useQuoteDialog } from "@/components/quotes/quote-dialog-provider";

export function AppHeader({ userName, userEmail, unread }: { userName: string; userEmail: string; unread: number }) {
  const { openCreate } = useQuoteDialog();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-5 md:block" />
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1">
        <Button onClick={() => openCreate()} className="hidden sm:inline-flex" data-testid="header-add-quote">
          <Plus /> Ajouter un devis
        </Button>
        <NotificationsMenu key={unread} unread={unread} />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
