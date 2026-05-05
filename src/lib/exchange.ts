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
  HNL: 24.7,
  GTQ: 7.8,
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
 * Pull live USD-anchored rates from Frankfurter (https://frankfurter.dev) — a
 * free, key-less, ECB-backed API. We migrated off exchangerate.host because
 * Apilayer turned it into a key-required service in 2024 and every call from
 * the browser silently failed back to the static table without telling the user.
 *
 * Frankfurter doesn't quote LATAM currencies (ARS/COP/CLP/PEN/HNL/GTQ), so we
 * merge whatever it returns over the static fallback. Result is "live" only
 * when at least one fresh rate came back.
 */
export async function fetchRates(): Promise<ExchangeRatesResult> {
  const symbols = SUPPORTED.filter((c) => c !== "USD").join(",");
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${symbols}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Partial<Record<Currency, number>> };
    if (!json.rates) throw new Error("No rates in response");

    const rates = { ...FALLBACK_RATES };
    let liveCount = 0;
    for (const code of SUPPORTED) {
      if (code === "USD") continue;
      const live = json.rates[code];
      if (typeof live === "number" && live > 0) {
        rates[code] = live;
        liveCount++;
      }
    }
    return {
      rates,
      fetchedAt: new Date().toISOString(),
      // Only flag as "live" if the API actually returned at least one quote.
      // Avoids the previous behaviour where a 200-OK with empty rates would
      // pretend everything was live while silently serving the static table.
      source: liveCount > 0 ? "live" : "fallback",
    };
  } catch {
    return {
      rates: { ...FALLBACK_RATES },
      fetchedAt: new Date().toISOString(),
      source: "fallback",
    };
  }
}
