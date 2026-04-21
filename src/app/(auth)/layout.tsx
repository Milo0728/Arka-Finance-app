import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">New to Arka?</span>
            <Link href="/register" className="text-foreground hover:underline">
              Create account
            </Link>
            <ThemeToggle compact />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Arka Finance · Secure auth powered by Firebase
        </footer>
      </div>
    </div>
  );
}
