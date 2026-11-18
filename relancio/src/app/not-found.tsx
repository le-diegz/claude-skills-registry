import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Erreur 404</p>
        <h1 className="text-2xl font-semibold">Page introuvable</h1>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      </div>
      <Button asChild><Link href="/tableau-de-bord">Retour au tableau de bord</Link></Button>
    </div>
  );
}
