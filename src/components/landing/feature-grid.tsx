"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  PiggyBank,
  Target,
  Sparkles,
  ShieldCheck,
  Repeat,
  Heart,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const featureKeys = [
  { key: "income", icon: Wallet },
  { key: "dashboard", icon: BarChart3 },
  { key: "goals", icon: Target },
  { key: "babylon", icon: PiggyBank },
  { key: "insights", icon: Sparkles },
  { key: "subscriptions", icon: Repeat },
  { key: "health", icon: Heart },
  { key: "secure", icon: ShieldCheck },
] as const;

export function FeatureGrid() {
  const t = useTranslations("landing.features");
  return (
    <section id="features" className="border-t bg-muted/20 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureKeys.map(({ key, icon: Icon }) => (
            <Card key={key} className="group relative overflow-hidden border bg-card/80 p-0 transition hover:shadow-md">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`items.${key}.description`)}</p>
              </CardContent>
              <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
