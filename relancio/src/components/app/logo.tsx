import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" fill="#176B68" />
      <path d="M10 22V10h6.2c2.6 0 4.3 1.5 4.3 3.8 0 1.8-1 3-2.6 3.5L21 22h-3.1l-2.9-4.4h-2.2V22H10Zm2.8-6.8h3.2c1.1 0 1.8-.6 1.8-1.5s-.7-1.5-1.8-1.5h-3.2v3Z" fill="#fff" />
      <circle cx="23.5" cy="9.5" r="2.5" fill="#6FB3AD" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-foreground", className)}>
      <LogoMark />
      <span className="text-[17px]">Relancio</span>
    </Link>
  );
}
