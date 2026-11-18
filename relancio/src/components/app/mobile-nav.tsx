"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FileText, LayoutDashboard, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuoteDialog } from "@/components/quotes/quote-dialog-provider";

const ITEMS = [
  { href: "/tableau-de-bord", label: "Accueil", icon: LayoutDashboard },
  { href: "/devis", label: "Devis", icon: FileText },
  null,
  { href: "/relances", label: "Relances", icon: BellRing },
  { href: "/clients", label: "Clients", icon: Users },
] as const;

/** Barre de navigation basse pour mobile (usage terrain, une main). */
export function MobileNav({ followupCount }: { followupCount: number }) {
  const pathname = usePathname();
  const { openCreate } = useQuoteDialog();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ITEMS.map((item) =>
        item === null ? (
          <div key="add" className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => openCreate()}
              aria-label="Ajouter un devis"
              className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              pathname.startsWith(item.href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
            {item.href === "/relances" && followupCount > 0 && (
              <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] text-white">
                {followupCount > 99 ? "99+" : followupCount}
              </span>
            )}
          </Link>
        ),
      )}
    </nav>
  );
}
