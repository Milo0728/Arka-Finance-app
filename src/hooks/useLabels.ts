"use client";

import { useTranslations } from "next-intl";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

/**
 * Convenience translators for category / billing / period / month keys that
 * are stored as raw strings on finance entities but must render localised.
 */
export function useLabels() {
  const tExpense = useTranslations("categories.expense");
  const tIncome = useTranslations("categories.income");
  const tBilling = useTranslations("billing");
  const tExpenseType = useTranslations("expenseType");
  const tMonths = useTranslations("months");
  const tIncomeFreq = useTranslations("income.frequency");

  return {
    expenseCategory: (key: string) => safe(tExpense, key),
    incomeCategory: (key: string) => safe(tIncome, key),
    category: (key: string) => safe(tExpense, key) ?? safe(tIncome, key) ?? key,
    billing: (key: string) => safe(tBilling, key) ?? key,
    expenseType: (key: string) => safe(tExpenseType, key) ?? key,
    monthShort: (index: number) => safe(tMonths, MONTH_KEYS[index]) ?? MONTH_KEYS[index],
    incomeFrequency: (key: string) =>
      key === "once" ? safe(tIncomeFreq, "once") ?? key : safe(tBilling, key) ?? key,
  };
}

type TFn = (key: string) => string;

function safe(t: TFn, key: string): string | undefined {
  try {
    return t(key);
  } catch {
    return undefined;
  }
}
