"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";

const tierDefs = [
  { key: "starter", price: "free", period: null, highlighted: true, featureCount: 4, available: true },
  { key: "arkad", price: "$6", period: "perMonth", highlighted: false, featureCount: 5, available: false },
  { key: "household", price: "$10", period: "perMonth", highlighted: false, featureCount: 4, available: false },
] as const;

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const ctaHref = !authLoading && user ? "/dashboard" : "/register";
  return (
    <section id="pricing" className="border-t py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tierDefs.map((tier) => (
            <Card
              key={tier.key}
              className={`relative flex flex-col gap-6 border bg-card p-7 ${
                tier.highlighted ? "ring-2 ring-primary" : ""
              } ${!tier.available ? "opacity-70" : ""}`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{t(`tiers.${tier.key}.name`)}</h3>
                  {tier.highlighted && <Badge>{t("mostPopular")}</Badge>}
                  {!tier.available && (
                    <Badge variant="outline" className="border-dashed text-muted-foreground">
                      {t("comingSoon")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t(`tiers.${tier.key}.description`)}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl font-semibold tracking-tight ${
                    !tier.available ? "text-muted-foreground line-through decoration-muted-foreground/60" : ""
                  }`}
                >
                  {tier.price === "free" ? t("priceFree") : tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm text-muted-foreground ${
                      !tier.available ? "line-through decoration-muted-foreground/60" : ""
                    }`}
                  >
                    {t(tier.period)}
                  </span>
                )}
                {!tier.available && (
                  <span className="ml-2 text-xs font-medium text-primary">{t("freeDuringBeta")}</span>
                )}
              </div>
              <ul className="space-y-2 text-sm">
                {Array.from({ length: tier.featureCount }, (_, i) => i + 1).map((n) => (
                  <li key={n} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t(`tiers.${tier.key}.f${n}`)}</span>
                  </li>
                ))}
              </ul>
              {tier.available ? (
                <Button asChild variant={tier.highlighted ? "default" : "outline"}>
                  <Link href={ctaHref}>{t(`tiers.${tier.key}.cta`)}</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled aria-disabled className="cursor-not-allowed">
                  {t("notAvailableYet")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
