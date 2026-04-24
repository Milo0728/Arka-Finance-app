"use client";

import * as React from "react";
import { Sparkles, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { formatPercent } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { AccountComparisonRow } from "@/utils/account-comparison";

interface Props {
  rows: AccountComparisonRow[];
  /** How much two accounts must differ to surface the insight. 0.2 = 20%. */
  threshold?: number;
  /** Cap the number of insights shown to avoid overwhelming the UI. */
  maxInsights?: number;
}

type InsightTone = "info" | "warning" | "positive";

interface InsightEntry {
  id: string;
  tone: InsightTone;
  icon: React.ReactNode;
  text: string;
}

/**
 * Level 3 — pairwise auto-insights between accounts. Generates at most a
 * handful of the most significant differences so the user learns something
 * at a glance without reading a wall of text.
 *
 * Insight families (in priority order):
 *   1. savings-rate gap   — "A has better savings rate (22% vs 10%)"
 *   2. spend overshoot    — "You spent 35% more in A than in B"
 *   3. category dominance — "Food is 2x higher in A than in B"
 *
 * The threshold filter keeps us from flagging trivial differences.
 */
export function AccountComparisonInsights({
  rows,
  threshold = 0.2,
  maxInsights = 4,
}: Props) {
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("accountComparison.insights");

  const entries = React.useMemo<InsightEntry[]>(() => {
    if (rows.length < 2) return [];
    const out: InsightEntry[] = [];

    // 1. Savings-rate gap — compare the best and worst savers.
    const bySavings = [...rows].sort((a, b) => b.savingsRate - a.savingsRate);
    const [topS, bottomS] = [bySavings[0], bySavings[bySavings.length - 1]];
    if (topS && bottomS && topS !== bottomS) {
      const gap = topS.savingsRate - bottomS.savingsRate;
      // Absolute gap ≥ threshold (0.2 = 20 percentage points of rate).
      if (gap >= threshold) {
        out.push({
          id: "savings-gap",
          tone: "positive",
          icon: <PiggyBank className="h-4 w-4 text-success" />,
          text: t("savingsGap", {
            top: topS.label,
            topRate: formatPercent(topS.savingsRate * 100, 0),
            bottom: bottomS.label,
            bottomRate: formatPercent(bottomS.savingsRate * 100, 0),
          }),
        });
      }
    }

    // 2. Spend overshoot — biggest relative expense gap between any two rows.
    // Sort expenses desc and compare top vs the next non-zero one to surface
    // the most visible difference without enumerating O(n²).
    const byExpense = [...rows]
      .filter((r) => r.totalExpenses > 0)
      .sort((a, b) => b.totalExpenses - a.totalExpenses);
    if (byExpense.length >= 2) {
      const [high, low] = byExpense;
      const ratio = high.totalExpenses / Math.max(low.totalExpenses, 1);
      if (ratio - 1 >= threshold) {
        out.push({
          id: "spend-overshoot",
          tone: "warning",
          icon: <TrendingDown className="h-4 w-4 text-warning" />,
          text: t("spendOvershoot", {
            high: high.label,
            low: low.label,
            pct: formatPercent((ratio - 1) * 100, 0),
          }),
        });
      }
    }

    // 3. Category dominance — for each category, find the biggest ratio
    // between any two accounts' spend on it. Pick the top 1-2 dominating
    // categories so we don't drown the user in tiny comparisons.
    const categoryStats = new Map<
      string,
      Array<{ row: AccountComparisonRow; amount: number }>
    >();
    for (const row of rows) {
      for (const entry of row.topCategories) {
        const arr = categoryStats.get(entry.category) ?? [];
        arr.push({ row, amount: entry.amount });
        categoryStats.set(entry.category, arr);
      }
    }

    const categoryInsights: Array<{ ratio: number; entry: InsightEntry }> = [];
    for (const [category, list] of categoryStats) {
      if (list.length < 2) continue;
      const sorted = [...list].sort((a, b) => b.amount - a.amount);
      const [top, bottom] = sorted;
      if (top.amount === 0 || bottom.amount === 0) continue;
      const ratio = top.amount / bottom.amount;
      // Require the ratio to clear the same threshold — we use multiplication
      // (e.g. 2x = 100% more) since "2x" reads more intuitively than "100%".
      if (ratio - 1 < threshold) continue;
      categoryInsights.push({
        ratio,
        entry: {
          id: `category-${category}`,
          tone: "info",
          icon: <TrendingUp className="h-4 w-4 text-primary" />,
          text: t("categoryDominance", {
            category: labels.expenseCategory(category) ?? category,
            high: top.row.label,
            low: bottom.row.label,
            multiplier: ratio.toFixed(1),
          }),
        },
      });
    }
    categoryInsights
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 2)
      .forEach((c) => out.push(c.entry));

    return out.slice(0, maxInsights);
  }, [rows, threshold, maxInsights, t, labels]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <Sparkles className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
        {t("empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3 text-sm",
            e.tone === "positive" && "border-success/30 bg-success/5",
            e.tone === "warning" && "border-warning/30 bg-warning/5",
            e.tone === "info" && "border-primary/20 bg-primary/5"
          )}
        >
          <span className="mt-0.5 shrink-0">{e.icon}</span>
          <p className="min-w-0 flex-1 break-words">{e.text}</p>
        </li>
      ))}
    </ul>
  );
}
