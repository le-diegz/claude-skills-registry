"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, Database, FileText, Mail, Timer, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/parametres/profil", label: "Profil", icon: UserRound },
  { href: "/parametres/entreprise", label: "Entreprise", icon: Building2 },
  { href: "/parametres/membres", label: "Membres et rôles", icon: Users },
  { href: "/parametres/relances", label: "Politique de relance", icon: Timer },
  { href: "/parametres/modeles", label: "Modèles de relance", icon: FileText },
  { href: "/parametres/email", label: "Email", icon: Mail },
  { href: "/parametres/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres/donnees", label: "Données et confidentialité", icon: Database },
];

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Paramètres" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:w-56 lg:shrink-0 lg:overflow-visible lg:px-0">
      <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                pathname === i.href ? "bg-card font-medium text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <i.icon className="size-4" />
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
      {!isAdmin && <p className="mt-3 hidden px-3 text-xs text-muted-foreground lg:block">Certains réglages sont réservés aux administrateurs.</p>}
    </nav>
  );
}
