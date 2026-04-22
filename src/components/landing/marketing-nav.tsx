"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useAuthStore } from "@/store/useAuthStore";

export function MarketingNav() {
  const t = useTranslations("common");
  const tn = useTranslations("landing.nav");
  const tHero = useTranslations("landing.hero");
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const isAuthed = !authLoading && !!user;
  const links = [
    { href: "#features", label: tn("features") },
    { href: "#philosophy", label: tn("philosophy") },
    { href: "#screens", label: tn("product") },
    { href: "#pricing", label: tn("pricing") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-[10px] font-semibold uppercase tracking-wider text-primary"
          >
            {t("beta")}
          </Badge>
        </div>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle compact />
          <ThemeToggle compact />
          {isAuthed ? (
            <Button asChild size="sm">
              <Link href="/dashboard">{tHero("liveDashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("getStarted")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
