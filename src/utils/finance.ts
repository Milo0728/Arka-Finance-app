import { differenceInCalendarMonths, endOfMonth, isSameMonth, parseISO, startOfMonth } from "date-fns";
import type {
  BillingCycle,
  Budget,
  Expense,
  ExpenseCategory,
  Goal,
  HealthScoreBreakdown,
  Income,
  IncomeFrequency,
  Subscription,
} from "@/types";
import { isTransferCategory } from "@/lib/categories";

/**
 * Strip out internal account-to-account transfers before computing aggregates.
 * Transfers aren't net inflow/outflow — they just change which bucket the money
 * lives in. Counting them in monthly totals would double-count the same dollar
 * and wreck savings rate, spending ratio and health score.
 */
function excludeTransfersExpense<T extends Expense>(items: T[]): T[] {
  return items.filter((e) => !isTransferCategory(e.category));
}
function excludeTransfersIncome<T extends Income>(items: T[]): T[] {
  return items.filter((i) => !isTransferCategory(i.category));
}

/**
 * Converts a per-cycle amount into its equivalent monthly amount.
 * Shared by Subscriptions and recurring Incomes so they stay consistent.
 */
export function cycleToMonthly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return amount * 4.33;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
  }
}

export function sum<T>(items: T[], pick: (i: T) => number): number {
  return items.reduce((acc, i) => acc + (pick(i) || 0), 0);
}

export function filterByMonth<T extends { date: string }>(items: T[], reference: Date = new Date()): T[] {
  return items.filter((i) => isSameMonth(parseISO(i.date), reference));
}

/**
 * Returns the amount a single income contributes to the given month.
 * - "once" / undefined: the full amount only in the month matching its date.
 * - Recurring: the monthly equivalent, but only from the start month onwards.
 */
export function monthlyIncomeContribution(income: Income, reference = new Date()): number {
  const freq: IncomeFrequency = income.frequency ?? "once";
  const start = parseISO(income.date);
  if (freq === "once") {
    return isSameMonth(start, reference) ? income.amount : 0;
  }
  if (startOfMonth(reference).getTime() < startOfMonth(start).getTime()) {
    return 0;
  }
  return cycleToMonthly(income.amount, freq);
}

export function monthlyIncome(incomes: Income[], reference = new Date()) {
  return sum(excludeTransfersIncome(incomes), (i) => monthlyIncomeContribution(i, reference));
}

export function monthlyExpenses(expenses: Expense[], reference = new Date()) {
  return sum(filterByMonth(excludeTransfersExpense(expenses), reference), (e) => e.amount);
}

export function monthlyBalance(incomes: Income[], expenses: Expense[], reference = new Date()) {
  return monthlyIncome(incomes, reference) - monthlyExpenses(expenses, reference);
}

/**
 * Total amount an income has produced from its start date up to `asOf`.
 * One-off incomes contribute exactly their amount; recurring incomes extrapolate
 * their monthly equivalent across every elapsed month.
 */
export function lifetimeIncome(incomes: Income[], asOf = new Date()): number {
  return sum(excludeTransfersIncome(incomes), (i) => lifetimeContribution(i, asOf));
}

function lifetimeContribution(income: Income, asOf: Date): number {
  const freq: IncomeFrequency = income.frequency ?? "once";
  if (freq === "once") return income.amount;
  const start = parseISO(income.date);
  if (asOf.getTime() < start.getTime()) return 0;
  const months = Math.max(1, differenceInCalendarMonths(startOfMonth(asOf), startOfMonth(start)) + 1);
  return cycleToMonthly(income.amount, freq) * months;
}

export function totalBalance(incomes: Income[], expenses: Expense[]) {
  return lifetimeIncome(incomes) - sum(excludeTransfersExpense(expenses), (e) => e.amount);
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
  // Transfers are skipped so they never show up in "top categories" / pie charts.
  for (const e of excludeTransfersExpense(expenses)) {
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

/**
 * Returns a rolling series of monthly totals. `monthIndex` is 0-11 (Jan-Dec) so
 * the UI can look up a translated short-month label.
 */
export function incomeVsExpenseSeries(incomes: Income[], expenses: Expense[], months = 6) {
  const now = new Date();
  const buckets: {
    monthIndex: number;
    year: number;
    income: number;
    expense: number;
    savings: number;
  }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const income = monthlyIncome(incomes, ref);
    const expense = monthlyExpenses(expenses, ref);
    buckets.push({
      monthIndex: ref.getMonth(),
      year: ref.getFullYear(),
      income,
      expense,
      savings: Math.max(0, income - expense),
    });
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
  return cycleToMonthly(sub.amount, sub.billingCycle);
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
