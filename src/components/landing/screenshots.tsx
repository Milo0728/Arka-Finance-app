"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Gauge, Sparkles } from "lucide-react";

export function Screenshots() {
  const t = useTranslations("landing.screenshots");
  const overviewLabels = [
    { key: "balance", value: 18420 },
    { key: "income", value: 6050 },
    { key: "expenses", value: 3680 },
    { key: "savings", value: 640 },
  ] as const;
  const budgets = [
    { key: "food", pct: 68, color: "bg-brand-500" },
    { key: "transport", pct: 42, color: "bg-sky-500" },
    { key: "entertainment", pct: 88, color: "bg-amber-500" },
    { key: "subscriptions", pct: 100, color: "bg-rose-500" },
  ] as const;
  return (
    <section id="screens" className="border-t bg-muted/20 py-24">
      <div className="container space-y-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">{t("overviewBadge")}</Badge>
            <h3 className="text-lg font-semibold">{t("overviewTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("overviewBody")}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {overviewLabels.map((item) => (
                <div key={item.key} className="rounded-md border bg-background/70 p-3 text-xs">
                  <div className="text-muted-foreground">{t(`labels.${item.key}`)}</div>
                  <div className="arka-number mt-1 text-base font-semibold">
                    ${item.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">{t("budgetsBadge")}</Badge>
            <h3 className="text-lg font-semibold">{t("budgetsTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("budgetsBody")}
            </p>
            <div className="mt-6 space-y-3 text-xs">
              {budgets.map((b) => (
                <div key={b.key} className="space-y-1">
                  <div className="flex justify-between">
                    <span>{t(`categories.${b.key}`)}</span>
                    <span className="text-muted-foreground">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">{t("healthBadge")}</Badge>
            <h3 className="text-lg font-semibold">{t("healthTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("healthBody")}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(78 / 100) * 264}, 264`}
                    strokeLinecap="round"
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">78</div>
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2 text-success"><Gauge className="h-3 w-3" /> {t("good")}</div>
                <div className="mt-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t("savingsRateShort")}</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> {t("mom")}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
