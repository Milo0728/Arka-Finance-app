import type { Budget, Expense, FinancialInsight, Goal, Income, Subscription } from "@/types";
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

  return insights;
}
