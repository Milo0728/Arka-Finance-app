import type { Account, Expense, Income } from "@/types";
import { lifetimeIncome } from "./finance";

/**
 * Sentinel used in selectors to represent the "default" bucket — every income
 * or expense without an `accountId` is considered to live there. Keeps the
 * legacy data (no account field) functional without a backfill.
 */
export const DEFAULT_BUCKET_ID = "__default__";

export interface AccountBalance {
  accountId: string;
  /** Net contribution in USD: initial + lifetime income − total expenses on this account. */
  netUsd: number;
  /** Lifetime income in USD that ended up on this account. */
  incomeUsd: number;
  /** Lifetime expenses in USD that came out of this account. */
  expenseUsd: number;
}

function bucketOf(item: { accountId?: string }): string {
  return item.accountId ?? DEFAULT_BUCKET_ID;
}

/**
 * Per-account balance map keyed by account id (or DEFAULT_BUCKET_ID for
 * unassigned entries). Accepts the raw arrays from the store; callers can
 * combine the result with `accounts` for display.
 */
export function computeAccountBalances(
  incomes: Income[],
  expenses: Expense[],
  accounts: Account[]
): Map<string, AccountBalance> {
  const map = new Map<string, AccountBalance>();

  const ensure = (id: string): AccountBalance => {
    let row = map.get(id);
    if (!row) {
      row = { accountId: id, netUsd: 0, incomeUsd: 0, expenseUsd: 0 };
      map.set(id, row);
    }
    return row;
  };

  // Seed entries for every known account (so accounts with zero activity still appear).
  for (const a of accounts) {
    const row = ensure(a.id);
    row.netUsd += a.initialBalance ?? 0;
  }

  // Income contributions: lifetime income computes recurring frequencies properly.
  // Group by bucket then call lifetimeIncome on each subset to keep the math consistent
  // with the rest of the app.
  const byIncomeBucket = new Map<string, Income[]>();
  for (const i of incomes) {
    const b = bucketOf(i);
    byIncomeBucket.set(b, [...(byIncomeBucket.get(b) ?? []), i]);
  }
  for (const [bucket, list] of byIncomeBucket) {
    const lifetime = lifetimeIncome(list);
    const row = ensure(bucket);
    row.incomeUsd += lifetime;
    row.netUsd += lifetime;
  }

  for (const e of expenses) {
    const row = ensure(bucketOf(e));
    row.expenseUsd += e.amount;
    row.netUsd -= e.amount;
  }

  return map;
}

/** Sum of net balances across every bucket (default + named accounts). */
export function consolidatedBalance(
  incomes: Income[],
  expenses: Expense[],
  accounts: Account[]
): number {
  const balances = computeAccountBalances(incomes, expenses, accounts);
  let total = 0;
  for (const b of balances.values()) total += b.netUsd;
  return total;
}

/**
 * Filter incomes/expenses by an active account id. Passing `null` returns the
 * input untouched (consolidated view).
 */
export function filterByAccount<T extends { accountId?: string }>(
  items: T[],
  accountId: string | null
): T[] {
  if (!accountId) return items;
  if (accountId === DEFAULT_BUCKET_ID) return items.filter((i) => !i.accountId);
  return items.filter((i) => i.accountId === accountId);
}
