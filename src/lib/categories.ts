import type { ExpenseCategory, IncomeCategory } from "@/types";

export const EXPENSE_CATEGORY_VALUES: ExpenseCategory[] = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "subscriptions",
  "health",
  "education",
  "shopping",
  "savings",
  "debt",
  "other",
  "transfer",
];

export const INCOME_CATEGORY_VALUES: IncomeCategory[] = [
  "salary",
  "freelance",
  "investment",
  "business",
  "gift",
  "other",
  "transfer",
];

/**
 * Categories that represent money moving between the user's own accounts.
 * They're valid categories for data-entry purposes, but they must be excluded
 * from income/expense totals — otherwise a $500 transfer inflates BOTH the
 * income and expense side of the month, which kills the savings rate.
 */
export const TRANSFER_CATEGORIES: readonly string[] = ["transfer"] as const;

export function isTransferCategory(category: string): boolean {
  return TRANSFER_CATEGORIES.includes(category);
}

/** Categories that make sense to budget against — "transfer" is excluded because
 *  transfers aren't spending. Used by the budget form dropdown. */
export const BUDGETABLE_EXPENSE_CATEGORIES: ExpenseCategory[] =
  EXPENSE_CATEGORY_VALUES.filter((c) => !isTransferCategory(c));
