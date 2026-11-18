import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><a href="/demo">Démo</a></Button>
            <Button variant="ghost" asChild><Link href="/connexion">Connexion</Link></Button>
            <Button asChild><Link href="/inscription">Essayer</Link></Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Relancio · Suivi et relance de devis pour les artisans du génie climatique</p>
          <div className="flex gap-4">
            <Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
