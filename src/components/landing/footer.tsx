import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-sm text-muted-foreground">
            Arka Finance — a calm, modern dashboard for the money you earn, spend and grow.
            Inspired by Arkad, built in TypeScript.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
          <Link href="/register" className="hover:text-foreground">Create account</Link>
          <Link href="/dashboard" className="hover:text-foreground">Live demo</Link>
          <a href="mailto:hello@arka.finance" className="hover:text-foreground">Contact</a>
        </nav>
      </div>
      <div className="container mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Arka Finance. Crafted with care. Not a financial advisor.
      </div>
    </footer>
  );
}
