"use client";

import { Award, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMoney } from "@/hooks/useMoney";
import { formatPercent } from "@/lib/currency";
import type {
  AccountComparisonRow,
  ComparisonHighlights,
} from "@/utils/account-comparison";

interface Props {
  rows: AccountComparisonRow[];
  highlights: ComparisonHighlights;
}

/**
 * Level 1 — one card per account with headline KPIs + "winner" badges.
 * Designed for quick scanning: 1 column on mobile, up to 3 on desktop.
 * Uses compact formatting on narrow screens so long amounts fit.
 */
export function AccountComparisonSummary({ rows, highlights }: Props) {
  const money = useMoney();
  const t = useTranslations("accountComparison");

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const isTopIncome = highlights.topIncomeId === row.accountId;
        const isTopExpense = highlights.topExpenseId === row.accountId;
        const isTopSavings = highlights.topSavingsId === row.accountId;

        return (
          <Card key={row.accountId} className="min-w-0">
            <CardContent className="min-w-0 space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.label}</p>
                  {row.isGeneral && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("generalHint")}
                    </p>
                  )}
                </div>
                {/* Badge stack: max 2 visible at once. Savings wins over income
                    when both apply because "best-saver" is the rarer signal. */}
                <div className="flex shrink-0 flex-col gap-1">
                  {isTopSavings && (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <Award className="h-2.5 w-2.5" />
                      {t("badges.topSavings")}
                    </Badge>
                  )}
                  {isTopIncome && !isTopSavings && (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {t("badges.topIncome")}
                    </Badge>
                  )}
                  {isTopExpense && (
                    <Badge variant="warning" className="gap-1 text-[10px]">
                      <TrendingDown className="h-2.5 w-2.5" />
                      {t("badges.topExpense")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Balance — the headline number. Compact on mobile (6.7M) to
                  keep the layout stable across currencies. */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("metrics.balance")}
                </p>
                <p
                  className="arka-number truncate text-xl font-semibold sm:text-2xl"
                  title={money.format(row.balance)}
                >
                  <span className="hidden sm:inline">{money.format(row.balance)}</span>
                  <span className="sm:hidden">{money.formatCompact(row.balance)}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <SummaryMetric
                  label={t("metrics.income")}
                  value={money.formatCompact(row.totalIncome)}
                  title={money.format(row.totalIncome)}
                  tone="success"
                />
                <SummaryMetric
                  label={t("metrics.expenses")}
                  value={money.formatCompact(row.totalExpenses)}
                  title={money.format(row.totalExpenses)}
                  tone="destructive"
                />
                <SummaryMetric
                  label={t("metrics.savings")}
                  value={formatPercent(row.savingsRate * 100, 0)}
                  tone={row.savingsRate >= 0.1 ? "success" : "muted"}
                  icon={<PiggyBank className="h-3 w-3" />}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  title,
  tone,
  icon,
}: {
  label: string;
  value: string;
  title?: string;
  tone: "success" | "destructive" | "muted";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p className={`arka-number truncate text-sm font-medium ${toneClass}`} title={title}>
        {value}
      </p>
    </div>
  );
}
