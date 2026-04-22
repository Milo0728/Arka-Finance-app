"use client";

import { PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { babylonSavingsTarget, savingsRate } from "@/utils/finance";
import { useMoney } from "@/hooks/useMoney";

interface BabylonWidgetProps {
  /** Monthly income in USD (base currency). */
  monthlyIncome: number;
  /** Monthly expenses in USD (base currency). */
  monthlyExpenses: number;
}

export function BabylonWidget({ monthlyIncome, monthlyExpenses }: BabylonWidgetProps) {
  const money = useMoney();
  const t = useTranslations("babylon");

  if (monthlyIncome <= 0) {
    return (
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-4 w-4 text-primary" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("emptyTitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("emptyDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  const target = babylonSavingsTarget(monthlyIncome);
  const actualSavings = Math.max(0, monthlyIncome - monthlyExpenses);
  const rate = savingsRate(monthlyIncome, monthlyExpenses);
  const pct = target > 0 ? Math.min(100, (actualSavings / target) * 100) : 0;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("saveThisMonth")}</p>
            <p className="arka-number mt-1 text-2xl font-semibold">{money.format(target)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("savedSoFar")}</p>
            <p className="arka-number mt-1 text-2xl font-semibold text-success">
              {money.format(actualSavings)}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("progress")}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <Progress
            value={pct}
            indicatorClassName="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("actualRate")}{" "}
          <span className="font-medium text-foreground">{rate.toFixed(1)}%</span>
          {rate < 10 ? t("keepGoing") : t("wellDone")}
        </p>
      </CardContent>
    </Card>
  );
}
