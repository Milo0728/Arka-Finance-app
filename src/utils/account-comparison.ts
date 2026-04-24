import type { Account, Expense, ExpenseCategory, Income } from "@/types";
import { DEFAULT_BUCKET_ID, filterByAccount } from "./accounts";
import {
  expensesByCategory,
  lifetimeIncome,
  monthlyExpenses,
  monthlyIncome,
} from "./finance";
import { subMonths } from "date-fns";

/**
 * One row of the comparison table / summary cards. Every computed field is
 * denormalised here so the downstream UI is pure rendering — no derivations
 * inside the React tree.
 */
export interface AccountComparisonRow {
  /** Real account id, or DEFAULT_BUCKET_ID for "General" (unassigned). */
  accountId: string;
  /** UI label. Real account name or the localised "General" label. */
  label: string;
  isGeneral: boolean;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  /**
   * Savings rate — `(income − expenses) / max(income, 1)`.
   * Using `max(income, 1)` instead of `income` prevents a divide-by-zero
   * when a bucket has expenses but no income (e.g. an account that only
   * pays things). The rate is clamped to [-∞, 1] by definition, so callers
   * can compare directly.
   */
  savingsRate: number;
  topCategories: { category: ExpenseCategory; amount: number }[];
  /** 6-month rolling series, oldest → newest. Income, expense, and net balance. */
  monthlySeries: {
    monthIndex: number;
    year: number;
    income: number;
    expense: number;
    balance: number;
  }[];
}

/**
 * Build one row per relevant bucket (real accounts + "General" when it has
 * activity). Filters out empty buckets so the UI doesn't show dead cards.
 *
 *   - Transfers are already excluded by monthlyIncome / monthlyExpenses /
 *     lifetimeIncome (they filter category === "transfer"), so we get clean
 *     "real" totals out of the box.
 *   - Monthly series uses the same helpers, applied per reference month,
 *     reusing existing logic instead of duplicating month-bucketing code.
 *
 * @param generalLabel   localised label for the default bucket ("General" / "Sin cuenta").
 * @param months         window for the monthly trend. Default 6.
 */
export function getAccountComparison(
  incomes: Income[],
  expenses: Expense[],
  accounts: Account[],
  generalLabel: string,
  months = 6
): AccountComparisonRow[] {
  const now = new Date();

  // Ordered list of buckets: real accounts first (stable by their own order),
  // General last so it doesn't dominate visually when it's a minor bucket.
  const buckets: Array<{ id: string; label: string; isGeneral: boolean }> = [
    ...accounts.map((a) => ({ id: a.id, label: a.name, isGeneral: false })),
    { id: DEFAULT_BUCKET_ID, label: generalLabel, isGeneral: true },
  ];

  const rows: AccountComparisonRow[] = buckets.map(({ id, label, isGeneral }) => {
    // filterByAccount already handles the DEFAULT_BUCKET_ID sentinel
    // (returns items with no accountId), so we don't branch here.
    const scopedIncomes = filterByAccount(incomes, id);
    const scopedExpenses = filterByAccount(expenses, id);

    const totalIncome = lifetimeIncome(scopedIncomes);
    const totalExpenses = monthlyExpenses(scopedExpenses, now);
    // monthlyExpenses filters to current month — we want lifetime here, so
    // reuse the same transfer-aware sum but across all time.
    const lifetimeExpense = scopedExpenses
      .filter((e) => e.category !== "transfer")
      .reduce((acc, e) => acc + e.amount, 0);

    const balance = totalIncome - lifetimeExpense;
    const savingsRate =
      totalIncome > 0 ? (totalIncome - lifetimeExpense) / totalIncome : 0;

    // Top categories: reuse expensesByCategory (already transfer-aware),
    // then sort and take top 5. Empty categories are dropped by the sort.
    const byCategory = expensesByCategory(scopedExpenses);
    const topCategories = (Object.keys(byCategory) as ExpenseCategory[])
      .map((category) => ({ category, amount: byCategory[category] }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Monthly series: re-run the existing month helpers for each reference
    // point. Cheap enough for 6-12 months; no custom bucketing needed.
    const monthlySeries = Array.from({ length: months }, (_, i) => {
      const ref = subMonths(now, months - 1 - i);
      const income = monthlyIncome(scopedIncomes, ref);
      const expense = monthlyExpenses(scopedExpenses, ref);
      return {
        monthIndex: ref.getMonth(),
        year: ref.getFullYear(),
        income,
        expense,
        balance: income - expense,
      };
    });

    return {
      accountId: id,
      label,
      isGeneral,
      totalIncome,
      totalExpenses: lifetimeExpense,
      balance,
      savingsRate,
      topCategories,
      monthlySeries,
    };
  });

  // Drop empty buckets — showing "General" with all zeros adds noise when
  // every entry already belongs to a real account.
  return rows.filter(
    (r) => r.totalIncome > 0 || r.totalExpenses > 0 || !r.isGeneral
  );
}

/**
 * Flag the winning row per metric. Used by both the Summary cards and the
 * comparison Table to highlight "best of N" visually. Ties → no winner
 * (returns null for that metric) to avoid picking arbitrarily.
 */
export interface ComparisonHighlights {
  topIncomeId: string | null;
  topExpenseId: string | null;
  topSavingsId: string | null;
}

export function getComparisonHighlights(rows: AccountComparisonRow[]): ComparisonHighlights {
  const pickTop = (key: "totalIncome" | "totalExpenses" | "savingsRate") => {
    if (rows.length === 0) return null;
    const sorted = [...rows].sort((a, b) => b[key] - a[key]);
    const [first, second] = sorted;
    if (second && first[key] === second[key]) return null; // tie
    return first.accountId;
  };
  return {
    topIncomeId: pickTop("totalIncome"),
    topExpenseId: pickTop("totalExpenses"),
    topSavingsId: pickTop("savingsRate"),
  };
}
