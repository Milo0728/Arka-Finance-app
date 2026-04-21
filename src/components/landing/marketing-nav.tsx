"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";

const links = [
  { href: "#features", label: "Features" },
  { href: "#philosophy", label: "Philosophy" },
  { href: "#screens", label: "Product" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
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
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t("getStarted")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
