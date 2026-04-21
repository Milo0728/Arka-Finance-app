"use client";

import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCompact, formatCurrency } from "@/lib/currency";
import { BASE_CURRENCY, FALLBACK_RATES } from "@/lib/exchange";
import type { Currency } from "@/types";

/**
 * Single source of truth for money display.
 *
 * All persisted amounts are stored in USD (the base currency). This hook converts
 * them to the user's chosen display currency using the rates cached in the store
 * and exposes helpers for the opposite direction (form input → USD).
 */
export function useMoney() {
  const currency = useFinanceStore((s) => s.currency);
  const rates = useFinanceStore((s) => s.rates);
  const ratesUpdatedAt = useFinanceStore((s) => s.ratesUpdatedAt);
  const ratesSource = useFinanceStore((s) => s.ratesSource);

  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;

  return {
    currency,
    baseCurrency: BASE_CURRENCY as Currency,
    rate,
    ratesUpdatedAt,
    ratesSource,
    /** Format a USD amount in the user's display currency. */
    format: (usdAmount: number) => formatCurrency(usdAmount * rate, currency),
    /** Compact version (e.g. "$1.2K") of a USD amount in display currency. */
    formatCompact: (usdAmount: number) => formatCompact(usdAmount * rate, currency),
    /** Convert an amount typed by the user (in display currency) to USD for storage. */
    toUSD: (displayAmount: number) => (rate === 0 ? displayAmount : displayAmount / rate),
    /** Convert a stored USD amount to display currency (unformatted number). */
    fromUSD: (usdAmount: number) => usdAmount * rate,
  };
}
