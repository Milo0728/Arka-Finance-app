"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

export function LandingCTA() {
  const t = useTranslations("landing.cta");
  const tHero = useTranslations("landing.hero");
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const isAuthed = !authLoading && !!user;
  return (
    <section className="border-t py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 p-10 text-white shadow-xl sm:p-16">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_auto] lg:items-end">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                {t("eyebrow")}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {t("headlineLine1")}
                <br />
                <span className="text-white/80">{t("headlineLine2")}</span>
              </h2>
              <p className="max-w-xl text-white/70">
                {t("body")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAuthed ? (
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">
                    {tHero("liveDashboard")} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/register">
                      {t("createAccount")} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                    <Link href="/login">{t("iHaveOne")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
