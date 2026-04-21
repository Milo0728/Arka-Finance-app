import type { Currency } from "@/types";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "ARS", label: "Argentine Peso", symbol: "ARS$" },
  { code: "COP", label: "Colombian Peso", symbol: "COL$" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "CLP", label: "Chilean Peso", symbol: "CLP$" },
  { code: "PEN", label: "Peruvian Sol", symbol: "S/" },
];

export function formatCurrency(value: number, currency: Currency = "USD", locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number, currency: Currency = "USD") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}
