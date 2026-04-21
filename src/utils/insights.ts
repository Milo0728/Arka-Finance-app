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

/**
 * Generates human-friendly insights from the user's data.
 * `format` receives amounts in USD (base) and is expected to produce a display string
 * already converted to the user's display currency.
 */
export function generateInsights(args: {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  format: (usdAmount: number) => string;
}): FinancialInsight[] {
  const { incomes, expenses, budgets, subscriptions, goals, format } = args;
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
        title: "You're honoring the 10% rule",
        description: `This month you saved ${formatPercent(rate, 1)} of your income — Arkad would approve.`,
        value: format(income - expense),
      });
    } else {
      insights.push({
        id: "babylon-below",
        level: "warning",
        title: "Pay yourself first",
        description: `Set aside ${format(target)} this month to reach the 10% savings rule.`,
        value: formatPercent(rate, 1),
      });
    }
  }

  const total = expense;
  if (total > 0) {
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const [topCat, topAmount] = sorted[0] ?? [null, 0];
    if (topCat) {
      const share = (topAmount / total) * 100;
      if (share >= 30) {
        insights.push({
          id: `category-dominant-${topCat}`,
          level: share >= 45 ? "critical" : "warning",
          title: `${capitalize(topCat)} dominates your spending`,
          description: `You spent ${formatPercent(share, 0)} of your outflow on ${topCat} this month.`,
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
        title: "Subscriptions are stacking up",
        description: `Recurring services represent ${formatPercent(share, 0)} of your monthly spending.`,
        value: format(subsTotal),
      });
    }
  }

  for (const b of budgets) {
    const u = budgetUsage(expenses, b);
    if (u.pct >= 100) {
      insights.push({
        id: `budget-over-${b.id}`,
        level: "critical",
        title: `Over budget on ${b.category}`,
        description: `You used ${formatPercent(u.pct, 0)} of your ${b.category} budget.`,
        value: format(u.used),
      });
    } else if (u.pct >= 80) {
      insights.push({
        id: `budget-warn-${b.id}`,
        level: "warning",
        title: `Approaching ${b.category} limit`,
        description: `You've used ${formatPercent(u.pct, 0)} of your ${b.category} budget.`,
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
        title: `Goal achieved: ${g.title}`,
        description: "Consider setting a new target to keep momentum.",
        value: format(g.targetAmount),
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "empty",
      level: "info",
      title: "Keep logging to unlock insights",
      description: "Add a few incomes and expenses and Arka will surface patterns automatically.",
    });
  }

  return insights;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
