import Link from "next/link";
import { Logo } from "@/components/app/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">
          Voir la démo
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
        <Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
        <span className="mx-2">·</span>
        <Link href="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
      </footer>
    </div>
  );
}
