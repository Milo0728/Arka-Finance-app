"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles, ShieldCheck, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "./hero-preview";
import { useAuthStore } from "@/store/useAuthStore";

export function Hero() {
  const t = useTranslations("landing.hero");
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const isAuthed = !authLoading && !!user;
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid gradient-mask pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/40 to-background" />

      <div className="container pt-20 pb-28 lg:pt-28">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("inspiredBy")} <span className="text-foreground">{t("inspiredBySource")}</span>
            </div>

            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("headlineLine1")}
              <br />
              <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-brand-700 bg-clip-text text-transparent">
                {t("headlineLine2")}
              </span>
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              {t("subtitle")}
            </p>

            <div className="flex flex-wrap gap-3">
              {isAuthed ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    {t("liveDashboard")} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/register">
                      {t("openArka")} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/dashboard">{t("liveDashboard")}</Link>
                  </Button>
                </>
              )}
            </div>

            <dl className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>{t("securityBadge")}</span>
              </div>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                <span>{t("insightsBadge")}</span>
              </div>
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <HeroPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
