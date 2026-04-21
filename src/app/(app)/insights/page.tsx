"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { InsightsList } from "@/components/dashboard/insights-list";
import { HealthScore } from "@/components/dashboard/health-score";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { generateInsights } from "@/utils/insights";
import { computeHealthScore, topCategories } from "@/utils/finance";
import { categoryLabel } from "@/lib/categories";

export default function InsightsPage() {
  const { incomes, expenses, budgets, goals, subscriptions } = useFinanceStore();
  const money = useMoney();
  const t = useTranslations("insights");
  const insights = generateInsights({
    incomes,
    expenses,
    budgets,
    goals,
    subscriptions,
    format: money.format,
  });
  const score = computeHealthScore({ incomes, expenses, budgets, goals });
  const categories = topCategories(expenses, 5);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <InsightsList insights={insights} title={t("all")} />
        <div className="space-y-4">
          <HealthScore score={score} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("topCategoriesTitle")}
              </CardTitle>
              <CardDescription>{t("topCategoriesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>
              ) : (
                categories.map((c, idx) => (
                  <div key={c.category} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="flex-1 capitalize">{categoryLabel(c.category)}</span>
                    <span className="arka-number text-muted-foreground">
                      {money.format(c.amount)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
