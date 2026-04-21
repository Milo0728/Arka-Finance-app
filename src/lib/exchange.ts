import type { Currency } from "@/types";

/**
 * Arka stores every amount in USD (the base currency). The `currency` setting in
 * the store is purely a *display* preference. Values are converted on render using
 * the rates cached in the store.
 */
export const BASE_CURRENCY: Currency = "USD";

/** Offline / first-render fallback. Updated manually as a safety net. */
export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 17.1,
  ARS: 1050,
  COP: 4050,
  BRL: 5.1,
  CLP: 950,
  PEN: 3.7,
};

const SUPPORTED: Currency[] = Object.keys(FALLBACK_RATES) as Currency[];

export interface ExchangeRatesResult {
  rates: Record<Currency, number>;
  fetchedAt: string;
  source: "live" | "fallback";
}

/**
 * Convert `amount` from one currency to another using a rates map anchored in USD.
 * rates[X] is the amount of X per 1 USD.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  const asUsd = amount / fromRate;
  return asUsd * toRate;
}

export function fromUSD(amountUSD: number, to: Currency, rates: Record<Currency, number>): number {
  return amountUSD * (rates[to] ?? 1);
}

export function toUSD(amount: number, from: Currency, rates: Record<Currency, number>): number {
  return amount / (rates[from] ?? 1);
}

/**
 * Pull live USD-anchored rates from exchangerate.host. Falls back to FALLBACK_RATES
 * on any network or parsing error so the app keeps working offline.
 */
export async function fetchRates(): Promise<ExchangeRatesResult> {
  const symbols = SUPPORTED.filter((c) => c !== "USD").join(",");
  try {
    const res = await fetch(
      `https://api.exchangerate.host/latest?base=USD&symbols=${symbols}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Partial<Record<Currency, number>> };
    if (!json.rates) throw new Error("No rates in response");

    const rates = { ...FALLBACK_RATES };
    for (const code of SUPPORTED) {
      if (code === "USD") continue;
      const live = json.rates[code];
      if (typeof live === "number" && live > 0) rates[code] = live;
    }
    return { rates, fetchedAt: new Date().toISOString(), source: "live" };
  } catch {
    return {
      rates: { ...FALLBACK_RATES },
      fetchedAt: new Date().toISOString(),
      source: "fallback",
    };
  }
}
