"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatCompact, formatCurrency } from "@/lib/currency";
import { BASE_CURRENCY, FALLBACK_RATES } from "@/lib/exchange";
import type { Currency } from "@/types";

/**
 * Single source of truth for money display.
 *
 * The returned object's identity is memoised on (currency, rate, source, updatedAt)
 * so it can be safely used as a useEffect / useMemo dependency without triggering
 * infinite loops.
 */
export function useMoney() {
  const currency = useFinanceStore((s) => s.currency);
  const rates = useFinanceStore((s) => s.rates);
  const ratesUpdatedAt = useFinanceStore((s) => s.ratesUpdatedAt);
  const ratesSource = useFinanceStore((s) => s.ratesSource);

  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;

  return useMemo(() => {
    const safeRate = rate > 0 ? rate : FALLBACK_RATES[currency] ?? 1;
    return {
      currency,
      baseCurrency: BASE_CURRENCY as Currency,
      rate,
      ratesUpdatedAt,
      ratesSource,
      format: (usdAmount: number) => formatCurrency(usdAmount * rate, currency),
      formatCompact: (usdAmount: number) => formatCompact(usdAmount * rate, currency),
      toUSD: (displayAmount: number) => displayAmount / safeRate,
      fromUSD: (usdAmount: number) => usdAmount * rate,
    };
  }, [currency, rate, ratesUpdatedAt, ratesSource]);
}
