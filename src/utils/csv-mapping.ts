import { EXPENSE_CATEGORY_VALUES } from "@/lib/categories";
import type { ExpenseCategory, ExpenseType } from "@/types";

/**
 * Canonical columns Arka cares about when importing expenses. Everything else
 * in the CSV is ignored. `date` and `amount` are required; the rest are optional
 * and get sensible defaults when missing.
 */
export type CanonicalField = "date" | "amount" | "description" | "category" | "type";

/**
 * Known header aliases in English / Spanish / French, plus a few common
 * variants exported by banks. Match is case-insensitive and diacritics-stripped
 * so "Descripción", "descripcion" and "DESCRIPCION" all hit the same bucket.
 */
const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  date: [
    "date",
    "fecha",
    "fecha_transaccion",
    "fecha transaccion",
    "fecha de transaccion",
    "fecha operacion",
    "fecha_operacion",
    "fecha de operacion",
    "fecha movimiento",
    "date operation",
    "date operation bancaire",
    "posted date",
    "transaction date",
    "fecha valor",
  ],
  amount: [
    "amount",
    "monto",
    "valor",
    "importe",
    "cantidad",
    "montant",
    "debit",
    "debito",
    "debito/credito",
    "transaction amount",
  ],
  description: [
    "description",
    "descripcion",
    "detalle",
    "concepto",
    "libelle",
    "memo",
    "narracion",
    "narrativa",
    "merchant",
    "beneficiary",
    "beneficiario",
    "referencia",
  ],
  category: [
    "category",
    "categoria",
    "tipo de gasto",
    "tipo gasto",
    "tipo de transaccion",
    "categorie",
    "rubro",
    "clasificacion",
  ],
  type: ["type", "tipo", "fijo/variable", "fixed/variable"],
};

function normaliseHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Strip combining diacritical marks (U+0300–U+036F) so "categoría" and
    // "categoria" collapse to the same key. Escaped form is safer than the
    // raw range across build toolchains.
    .replace(/[̀-ͯ]/g, "");
}

/** Result of auto-detecting the canonical-field → CSV-header mapping. */
export type ColumnMapping = Partial<Record<CanonicalField, string>>;

/**
 * Try to match every canonical field to one of the CSV headers using the
 * alias table. Unknown fields stay unmapped — the UI is responsible for
 * letting the user pick them manually.
 */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalised = headers.map((h) => ({ raw: h, key: normaliseHeader(h) }));
  (Object.keys(HEADER_ALIASES) as CanonicalField[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field].map(normaliseHeader);
    const hit = normalised.find((n) => aliases.includes(n.key));
    if (hit) mapping[field] = hit.raw;
  });
  return mapping;
}

/**
 * Normalise a raw amount string into a number. Handles:
 *   - currency symbols and letters ("$", "COP", "€", "USD") — stripped.
 *   - thousand separators ("15,000" → 15000, "15.000" → 15000).
 *   - decimal separators ("1,50" → 1.50, "1.50" → 1.50).
 *   - mixed ("1,500.50" → 1500.50, "1.500,50" → 1500.50).
 *   - negative signs.
 *
 * Returns null for empty / unparseable input.
 */
export function normalizeAmount(raw: string): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d,.\-]/g, "");
  if (!cleaned || cleaned === "-") return null;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;

  let normalised: string;
  if (commaCount === 0 && dotCount === 0) {
    normalised = cleaned;
  } else if (commaCount > 0 && dotCount > 0) {
    // Both present → the separator that appears last is the decimal point.
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalised = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalised = cleaned.replace(/,/g, "");
    }
  } else {
    // Only one kind of separator present.
    const sep = commaCount > 0 ? "," : ".";
    const count = commaCount + dotCount;
    const lastIdx = cleaned.lastIndexOf(sep);
    const digitsAfter = cleaned.length - lastIdx - 1;
    if (count >= 2) {
      // Multiple groups → it's a thousand separator.
      normalised = cleaned.split(sep).join("");
    } else if (digitsAfter === 3) {
      // Single separator with exactly 3 digits after: ambiguous, default to
      // thousand-grouping ("15,000" → 15000). Users entering "15,00" (two
      // decimals) land in the next branch.
      normalised = cleaned.split(sep).join("");
    } else {
      // Otherwise treat as decimal.
      normalised = cleaned.replace(",", ".");
    }
  }

  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/** Coerce a raw category cell into a valid ExpenseCategory, falling back to "other". */
export function normalizeCategory(raw: string | undefined): ExpenseCategory {
  const v = (raw ?? "").trim().toLowerCase();
  return (EXPENSE_CATEGORY_VALUES as string[]).includes(v) ? (v as ExpenseCategory) : "other";
}

/** Coerce a raw type cell. Anything other than "fixed" becomes "variable". */
export function normalizeType(raw: string | undefined): ExpenseType {
  return (raw ?? "").trim().toLowerCase() === "fixed" ? "fixed" : "variable";
}

/**
 * Accept both ISO dates (YYYY-MM-DD) and the day-first formats common in
 * Latin American banks (DD/MM/YYYY, DD-MM-YYYY). Returns an ISO string on
 * success, null on failure.
 */
export function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // Already ISO-ish: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (bank-style)
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fall back to Date.parse for everything else (e.g. "23 Apr 2026").
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}
