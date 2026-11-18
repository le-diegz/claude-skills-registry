import { Activity, BarChart3, BellRing, FileText, LayoutDashboard, Settings, Users } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/tableau-de-bord", label: "Vue d'ensemble", icon: LayoutDashboard, key: "dashboard" },
  { href: "/devis", label: "Devis", icon: FileText, key: "quotes" },
  { href: "/relances", label: "Relances", icon: BellRing, key: "followups" },
  { href: "/clients", label: "Clients", icon: Users, key: "customers" },
  { href: "/activite", label: "Activité", icon: Activity, key: "activity" },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3, key: "stats" },
  { href: "/parametres", label: "Paramètres", icon: Settings, key: "settings" },
] as const;
