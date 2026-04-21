import type { ExpenseCategory, IncomeCategory } from "@/types";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "housing", label: "Housing" },
  { value: "utilities", label: "Utilities" },
  { value: "entertainment", label: "Entertainment" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "shopping", label: "Shopping" },
  { value: "savings", label: "Savings" },
  { value: "debt", label: "Debt" },
  { value: "other", label: "Other" },
];

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "investment", label: "Investment" },
  { value: "business", label: "Business" },
  { value: "gift", label: "Gift" },
  { value: "other", label: "Other" },
];

export function categoryLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
