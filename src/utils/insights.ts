import type { Budget, Expense, FinancialInsight, Goal, Income, Subscription } from "@/types";
import { subMonths } from "date-fns";
import {
  babylonSavingsTarget,
  budgetUsage,
  expensesByCategory,
  monthlyExpenses,
  monthlyIncome,
  savingsRate,
  totalMonthlySubscriptions,
} from "./finance";
import { formatPercent } from "@/lib/currency";

/** Severity ordering — higher number means surfaced first. */
const LEVEL_WEIGHT: Record<FinancialInsight["level"], number> = {
  critical: 4,
  warning: 3,
  info: 2,
  positive: 1,
};

/**
 * Stable severity-first sort. Used by both the dashboard widget and the full
 * insights page so the principal alert stays consistent across the UI.
 */
export function prioritizeInsights(insights: FinancialInsight[]): FinancialInsight[] {
  return [...insights].sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level]);
}

export interface GenerateInsightsArgs {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  /** Convert a stored USD amount into a localised display string. */
  format: (usdAmount: number) => string;
  /** Resolve a category key into a localised label (e.g. "food" → "Comida"). */
  categoryLabel: (category: string) => string;
}

/**
 * Generates machine-readable insights from the user's data. Each insight carries
 * translation keys + ICU variables rather than pre-formatted strings — the UI layer
 * resolves them with `useTranslations("insights.rules")`.
 */
export function generateInsights(args: GenerateInsightsArgs): FinancialInsight[] {
  const { incomes, expenses, budgets, subscriptions, goals, format, categoryLabel } = args;
  const insights: FinancialInsight[] = [];
  const income = monthlyIncome(incomes);
  const expense = monthlyExpenses(expenses);
  const rate = savingsRate(income, expense);
  const byCategory = expensesByCategory(expenses);

  const target = babylonSavingsTarget(income);
  if (income > 0) {
    if (rate >= 10) {
      insights.push({
        id: "babylon-on-track",
        level: "positive",
        titleKey: "babylonOnTrackTitle",
        descriptionKey: "babylonOnTrackDesc",
        descriptionValues: { rate: formatPercent(rate, 1) },
        value: format(Math.max(0, income - expense)),
      });
    } else {
      insights.push({
        id: "babylon-below",
        level: "warning",
        titleKey: "babylonBelowTitle",
        descriptionKey: "babylonBelowDesc",
        descriptionValues: { amount: format(target) },
        value: formatPercent(rate, 1),
      });
    }
  }

  if (expense > 0) {
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const [topCat, topAmount] = sorted[0] ?? [null, 0];
    if (topCat) {
      const share = (topAmount / expense) * 100;
      if (share >= 30) {
        const label = categoryLabel(topCat);
        insights.push({
          id: `category-dominant-${topCat}`,
          level: share >= 45 ? "critical" : "warning",
          titleKey: "categoryDominantTitle",
          titleValues: { category: label },
          descriptionKey: "categoryDominantDesc",
          descriptionValues: { share: formatPercent(share, 0), category: label },
          value: format(topAmount),
        });
      }
    }
  }

  const subsTotal = totalMonthlySubscriptions(subscriptions);
  if (expense > 0 && subsTotal > 0) {
    const share = (subsTotal / expense) * 100;
    if (share >= 10) {
      insights.push({
        id: "subs-share",
        level: share >= 20 ? "warning" : "info",
        titleKey: "subsShareTitle",
        descriptionKey: "subsShareDesc",
        descriptionValues: { share: formatPercent(share, 0) },
        value: format(subsTotal),
      });
    }
  }

  for (const b of budgets) {
    const u = budgetUsage(expenses, b);
    const label = categoryLabel(b.category);
    if (u.pct >= 100) {
      insights.push({
        id: `budget-over-${b.id}`,
        level: "critical",
        titleKey: "budgetOverTitle",
        titleValues: { category: label },
        descriptionKey: "budgetOverDesc",
        descriptionValues: { pct: formatPercent(u.pct, 0), category: label },
        value: format(u.used),
      });
    } else if (u.pct >= 80) {
      insights.push({
        id: `budget-warn-${b.id}`,
        level: "warning",
        titleKey: "budgetWarnTitle",
        titleValues: { category: label },
        descriptionKey: "budgetWarnDesc",
        descriptionValues: { pct: formatPercent(u.pct, 0), category: label },
        value: format(u.used),
      });
    }
  }

  for (const g of goals) {
    const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    if (progress >= 100) {
      insights.push({
        id: `goal-done-${g.id}`,
        level: "positive",
        titleKey: "goalDoneTitle",
        titleValues: { title: g.title },
        descriptionKey: "goalDoneDesc",
        value: format(g.targetAmount),
      });
    }
  }

  // ── Month-over-month comparison ────────────────────────────────────────────
  // Only emit when both months have at least one expense — otherwise the delta
  // is noise (going from 0 to anything is mathematically infinite).
  const now = new Date();
  const prevRef = subMonths(now, 1);
  const prevExpense = monthlyExpenses(expenses, prevRef);
  if (expense > 0 && prevExpense > 0) {
    const delta = ((expense - prevExpense) / prevExpense) * 100;
    if (delta >= 25) {
      insights.push({
        id: "trend-spend-up",
        level: delta >= 50 ? "warning" : "info",
        titleKey: "trendSpendUpTitle",
        descriptionKey: "trendSpendUpDesc",
        descriptionValues: { delta: formatPercent(delta, 0) },
        value: format(expense - prevExpense),
      });
    } else if (delta <= -15) {
      insights.push({
        id: "trend-spend-down",
        level: "positive",
        titleKey: "trendSpendDownTitle",
        descriptionKey: "trendSpendDownDesc",
        descriptionValues: { delta: formatPercent(Math.abs(delta), 0) },
        value: format(prevExpense - expense),
      });
    }
  }

  // ── Predictive runway warning ──────────────────────────────────────────────
  // If current spend pace exceeds income, project the gap and flag it before the
  // month closes. Cheap and deterministic — no ML model needed.
  if (income > 0 && expense > income) {
    const overshoot = expense - income;
    insights.push({
      id: "predict-overshoot",
      level: "critical",
      titleKey: "predictOvershootTitle",
      descriptionKey: "predictOvershootDesc",
      descriptionValues: { amount: format(overshoot) },
      value: format(overshoot),
    });
  }

  return prioritizeInsights(insights);
}
