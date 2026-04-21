import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  href?: string;
}

export function Logo({ className, showWordmark = true, href = "/" }: LogoProps) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.4">
          <path d="M4 19 L12 4 L20 19" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 14 H16" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </span>
      {showWordmark && (
        <span className="flex items-baseline gap-1 font-semibold tracking-tight">
          <span className="text-foreground">Arka</span>
          <span className="text-muted-foreground text-sm">Finance</span>
        </span>
      )}
    </Link>
  );
}
