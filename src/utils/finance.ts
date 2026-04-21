import { differenceInCalendarMonths, endOfMonth, isSameMonth, parseISO, startOfMonth } from "date-fns";
import type { Budget, Expense, ExpenseCategory, Goal, HealthScoreBreakdown, Income, Subscription } from "@/types";

export function sum<T>(items: T[], pick: (i: T) => number): number {
  return items.reduce((acc, i) => acc + (pick(i) || 0), 0);
}

export function filterByMonth<T extends { date: string }>(items: T[], reference: Date = new Date()): T[] {
  return items.filter((i) => isSameMonth(parseISO(i.date), reference));
}

export function monthlyIncome(incomes: Income[], reference = new Date()) {
  return sum(filterByMonth(incomes, reference), (i) => i.amount);
}

export function monthlyExpenses(expenses: Expense[], reference = new Date()) {
  return sum(filterByMonth(expenses, reference), (e) => e.amount);
}

export function monthlyBalance(incomes: Income[], expenses: Expense[], reference = new Date()) {
  return monthlyIncome(incomes, reference) - monthlyExpenses(expenses, reference);
}

export function totalBalance(incomes: Income[], expenses: Expense[]) {
  return sum(incomes, (i) => i.amount) - sum(expenses, (e) => e.amount);
}

export function savingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
}

/**
 * The Babylon 10% rule — amount a user should save this month.
 */
export function babylonSavingsTarget(income: number, rate = 0.1): number {
  return Math.max(0, income * rate);
}

export function expensesByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const map = {} as Record<ExpenseCategory, number>;
  for (const e of expenses) {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  }
  return map;
}

export function topCategories(expenses: Expense[], limit = 5) {
  const grouped = expensesByCategory(expenses);
  return Object.entries(grouped)
    .map(([category, amount]) => ({ category: category as ExpenseCategory, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function incomeVsExpenseSeries(incomes: Income[], expenses: Expense[], months = 6) {
  const now = new Date();
  const buckets: { label: string; income: number; expense: number; savings: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = ref.toLocaleString("en-US", { month: "short" });
    const income = monthlyIncome(incomes, ref);
    const expense = monthlyExpenses(expenses, ref);
    buckets.push({ label, income, expense, savings: Math.max(0, income - expense) });
  }
  return buckets;
}

export function monthsUntil(deadline: string): number {
  return Math.max(0, differenceInCalendarMonths(parseISO(deadline), new Date()));
}

export function monthlySavingNeeded(goal: Goal): number {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const months = monthsUntil(goal.deadline);
  return months > 0 ? remaining / months : remaining;
}

export function monthlyEquivalent(sub: Subscription): number {
  switch (sub.billingCycle) {
    case "weekly":
      return sub.amount * 4.33;
    case "monthly":
      return sub.amount;
    case "quarterly":
      return sub.amount / 3;
    case "yearly":
      return sub.amount / 12;
  }
}

export function totalMonthlySubscriptions(subs: Subscription[]) {
  return sum(subs, monthlyEquivalent);
}

export function budgetUsage(expenses: Expense[], budget: Budget, reference = new Date()) {
  const windowStart = startOfMonth(reference);
  const windowEnd = endOfMonth(reference);
  const used = expenses
    .filter((e) => e.category === budget.category)
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= windowStart && d <= windowEnd;
    })
    .reduce((acc, e) => acc + e.amount, 0);
  return { used, limit: budget.limit, pct: budget.limit > 0 ? (used / budget.limit) * 100 : 0 };
}

export function computeHealthScore(input: {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
}): HealthScoreBreakdown {
  const income = monthlyIncome(input.incomes);
  const expense = monthlyExpenses(input.expenses);
  const sRate = savingsRate(income, expense);
  const ratio = income > 0 ? (expense / income) * 100 : 100;

  const adherences = input.budgets.map((b) => {
    const { used, limit } = budgetUsage(input.expenses, b);
    if (limit <= 0) return 100;
    const overshoot = Math.max(0, used - limit);
    return Math.max(0, 100 - (overshoot / limit) * 100);
  });
  const budgetAdherence = adherences.length
    ? adherences.reduce((a, b) => a + b, 0) / adherences.length
    : 75;

  const goalProgressValues = input.goals.map((g) =>
    g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0
  );
  const goalProgress = goalProgressValues.length
    ? goalProgressValues.reduce((a, b) => a + b, 0) / goalProgressValues.length
    : 50;

  const savingsScore = Math.min(100, (sRate / 20) * 100);
  const spendingScore = Math.max(0, 100 - Math.max(0, ratio - 70));
  const score = Math.round(
    savingsScore * 0.4 + spendingScore * 0.3 + budgetAdherence * 0.2 + goalProgress * 0.1
  );

  const tier: HealthScoreBreakdown["tier"] =
    score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 55 ? "fair" : score >= 35 ? "poor" : "critical";

  return {
    score: Math.max(0, Math.min(100, score)),
    savingsRate: sRate,
    expenseRatio: ratio,
    budgetAdherence,
    goalProgress,
    tier,
  };
}

export function detectPotentialSubscriptions(expenses: Expense[]): Expense[] {
  const byDescription = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = (e.description ?? "").trim().toLowerCase();
    if (!key) continue;
    byDescription.set(key, [...(byDescription.get(key) ?? []), e]);
  }
  const candidates: Expense[] = [];
  for (const group of byDescription.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const amounts = new Set(sorted.map((g) => Math.round(g.amount)));
    if (amounts.size === 1) candidates.push(sorted[sorted.length - 1]);
  }
  return candidates;
}
