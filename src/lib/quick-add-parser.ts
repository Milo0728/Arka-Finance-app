import type { ExpenseCategory, IncomeCategory } from "@/types";

/**
 * Lightweight natural-language parser for the Quick Add box.
 *
 * Goal: turn a single line like "25 almuerzo" or "120 gasolina" into a structured
 * suggestion (amount, description, suggested category). The parser stays
 * intentionally simple — anything we cannot infer is left for the user to confirm.
 *
 * Why a custom parser: pulling in an NLP dependency would be overkill for two
 * fields. A regex + keyword map keeps Quick Add snappy and bundle-light.
 */

const AMOUNT_RE = /-?\d+(?:[.,]\d+)?/;

const KEYWORDS: Array<{ category: ExpenseCategory; words: string[] }> = [
  { category: "food", words: ["almuerzo", "cena", "desayuno", "comida", "restaurante", "restaurant", "lunch", "dinner", "breakfast", "groceries", "supermercado", "café", "coffee"] },
  { category: "transport", words: ["gasolina", "gas", "uber", "taxi", "metro", "bus", "tren", "train", "fuel", "estacionamiento", "parking", "peaje", "toll"] },
  { category: "housing", words: ["renta", "rent", "alquiler", "mortgage", "hipoteca", "condo"] },
  { category: "utilities", words: ["luz", "agua", "internet", "wifi", "electricity", "water", "phone", "celular", "móvil"] },
  { category: "entertainment", words: ["cine", "movie", "concierto", "concert", "juego", "game", "netflix"] },
  { category: "subscriptions", words: ["suscripción", "subscription", "spotify", "icloud", "chatgpt", "saas"] },
  { category: "health", words: ["médico", "doctor", "farmacia", "pharmacy", "gimnasio", "gym", "clinic", "dentist"] },
  { category: "education", words: ["curso", "course", "libro", "book", "udemy", "coursera", "school", "escuela"] },
  { category: "shopping", words: ["amazon", "shopping", "ropa", "clothes", "zapatos", "shoes", "store", "tienda"] },
  { category: "savings", words: ["ahorro", "savings", "fondo"] },
  { category: "debt", words: ["deuda", "debt", "préstamo", "loan", "credit"] },
];

const INCOME_KEYWORDS: Array<{ category: IncomeCategory; words: string[] }> = [
  { category: "salary", words: ["salario", "salary", "paycheck", "nómina", "sueldo"] },
  { category: "freelance", words: ["freelance", "gig", "proyecto", "project", "client", "cliente"] },
  { category: "investment", words: ["dividendo", "dividend", "interest", "interés", "etf", "stocks", "investment"] },
  { category: "business", words: ["business", "empresa", "venta", "sale"] },
  { category: "gift", words: ["regalo", "gift", "bonus"] },
];

export interface ParsedQuickAdd {
  amount: number | null;
  description: string;
  /** Best-effort category guess; null when nothing in the keyword map matched. */
  category: ExpenseCategory | null;
  /** Income category guess (only when caller is in income mode). */
  incomeCategory: IncomeCategory | null;
}

export function parseQuickAdd(input: string): ParsedQuickAdd {
  const text = input.trim();
  if (!text) {
    return { amount: null, description: "", category: null, incomeCategory: null };
  }

  // Pull the first numeric token as the amount; remove only that token from the
  // description so users can write things like "uber 25 to airport" naturally.
  const match = text.match(AMOUNT_RE);
  let amount: number | null = null;
  let description = text;
  if (match) {
    amount = Number(match[0].replace(",", "."));
    description = (text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length)).trim();
  }

  const lower = description.toLowerCase();
  let category: ExpenseCategory | null = null;
  for (const entry of KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) {
      category = entry.category;
      break;
    }
  }
  let incomeCategory: IncomeCategory | null = null;
  for (const entry of INCOME_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) {
      incomeCategory = entry.category;
      break;
    }
  }

  return {
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    description: description.replace(/\s+/g, " ").trim(),
    category,
    incomeCategory,
  };
}

/**
 * Batch variant: split the input on commas or newlines and parse each segment.
 * Empty segments are skipped. Always returns at least one entry — when the user
 * types a single transaction it behaves identically to `parseQuickAdd`.
 *
 * The split intentionally happens BEFORE the regex runs so decimals using a
 * comma (e.g. "1,50") still work — those have no whitespace around the comma,
 * but multi-entry inputs always do (e.g. "20 uber, 30 lunch"). We split on
 * commas that are followed by whitespace OR are on their own line to avoid
 * eating decimals.
 */
export function parseQuickAddBatch(input: string): ParsedQuickAdd[] {
  const text = input.trim();
  if (!text) return [];
  const segments = text
    .split(/\n+|,(?=\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return [];
  return segments.map(parseQuickAdd);
}
