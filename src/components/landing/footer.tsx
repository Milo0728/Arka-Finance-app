"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { useAuthStore } from "@/store/useAuthStore";

export function MarketingFooter() {
  const t = useTranslations("landing.footer");
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const isAuthed = !authLoading && !!user;
  return (
    <footer className="border-t py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          {!isAuthed && (
            <>
              <Link href="/login" className="hover:text-foreground">{t("signIn")}</Link>
              <Link href="/register" className="hover:text-foreground">{t("createAccount")}</Link>
            </>
          )}
          <Link href="/dashboard" className="hover:text-foreground">{t("liveDemo")}</Link>
          <a href="mailto:jcrodriguezc0728@hotmail.com" className="hover:text-foreground">{t("contact")}</a>
        </nav>
      </div>
      <div className="container mt-8 text-xs text-muted-foreground">
        {t("copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
