import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateInsights, prioritizeInsights } from "@/utils/insights";
import type { Budget, Expense, FinancialInsight, Goal, Income, Subscription } from "@/types";

const NOW = new Date("2026-04-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const format = (n: number) => `$${n.toFixed(2)}`;
const categoryLabel = (c: string) => c;

function income(o: Partial<Income> = {}): Income {
  return {
    id: o.id ?? "i",
    userId: "u",
    amount: 1000,
    category: "salary",
    date: "2026-04-01",
    ...o,
  };
}

function expense(o: Partial<Expense> = {}): Expense {
  return {
    id: o.id ?? "e",
    userId: "u",
    amount: 100,
    category: "food",
    type: "variable",
    date: "2026-04-10",
    ...o,
  };
}

const baseArgs = {
  incomes: [] as Income[],
  expenses: [] as Expense[],
  budgets: [] as Budget[],
  goals: [] as Goal[],
  subscriptions: [] as Subscription[],
  format,
  categoryLabel,
};

describe("prioritizeInsights", () => {
  it("sorts critical → warning → info → positive", () => {
    const insights: FinancialInsight[] = [
      { id: "1", level: "positive", titleKey: "a", descriptionKey: "a" },
      { id: "2", level: "critical", titleKey: "b", descriptionKey: "b" },
      { id: "3", level: "info", titleKey: "c", descriptionKey: "c" },
      { id: "4", level: "warning", titleKey: "d", descriptionKey: "d" },
    ];
    const sorted = prioritizeInsights(insights).map((i) => i.level);
    expect(sorted).toEqual(["critical", "warning", "info", "positive"]);
  });

  it("does not mutate the input array", () => {
    const insights: FinancialInsight[] = [
      { id: "1", level: "positive", titleKey: "a", descriptionKey: "a" },
      { id: "2", level: "critical", titleKey: "b", descriptionKey: "b" },
    ];
    const before = [...insights];
    prioritizeInsights(insights);
    expect(insights).toEqual(before);
  });
});

describe("generateInsights — Babylon rule", () => {
  it("emits 'on track' positive insight when savings ≥ 10%", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 5000, date: "2026-01-01" })],
      expenses: [expense({ amount: 1000, date: "2026-04-10" })],
    });
    expect(result.some((i) => i.id === "babylon-on-track" && i.level === "positive")).toBe(true);
  });

  it("emits 'below' warning when savings < 10%", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 1000, date: "2026-01-01" })],
      expenses: [expense({ amount: 950, date: "2026-04-10" })],
    });
    expect(result.some((i) => i.id === "babylon-below" && i.level === "warning")).toBe(true);
  });

  it("does not emit babylon insight when income is zero", () => {
    const result = generateInsights({ ...baseArgs });
    expect(result.some((i) => i.id?.startsWith("babylon"))).toBe(false);
  });
});

describe("generateInsights — category dominance", () => {
  it("flags critical when one category is ≥ 45% of spend", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 2000, date: "2026-01-01" })],
      expenses: [
        expense({ id: "1", amount: 600, category: "food", date: "2026-04-10" }),
        expense({ id: "2", amount: 200, category: "transport", date: "2026-04-11" }),
        expense({ id: "3", amount: 200, category: "shopping", date: "2026-04-12" }),
      ],
    });
    const dominance = result.find((i) => i.id?.startsWith("category-dominant"));
    expect(dominance).toBeDefined();
    expect(dominance?.level).toBe("critical");
  });

  it("does not flag when no category exceeds 30%", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 2000, date: "2026-01-01" })],
      expenses: [
        expense({ id: "1", amount: 100, category: "food", date: "2026-04-10" }),
        expense({ id: "2", amount: 100, category: "transport", date: "2026-04-11" }),
        expense({ id: "3", amount: 100, category: "shopping", date: "2026-04-12" }),
        expense({ id: "4", amount: 100, category: "entertainment", date: "2026-04-13" }),
      ],
    });
    expect(result.some((i) => i.id?.startsWith("category-dominant"))).toBe(false);
  });
});

describe("generateInsights — budget overshoot", () => {
  it("emits 'critical' when a budget is ≥ 100% used", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 2000, date: "2026-01-01" })],
      expenses: [expense({ amount: 600, category: "food", date: "2026-04-10" })],
      budgets: [
        { id: "b1", userId: "u", category: "food", limit: 500, period: "monthly" },
      ],
    });
    expect(result.some((i) => i.id === "budget-over-b1" && i.level === "critical")).toBe(true);
  });

  it("emits 'warning' when a budget is between 80% and 100%", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 2000, date: "2026-01-01" })],
      expenses: [expense({ amount: 450, category: "food", date: "2026-04-10" })],
      budgets: [
        { id: "b1", userId: "u", category: "food", limit: 500, period: "monthly" },
      ],
    });
    expect(result.some((i) => i.id === "budget-warn-b1" && i.level === "warning")).toBe(true);
  });
});

describe("generateInsights — predictive overshoot", () => {
  it("flags critical when expenses exceed income for the month", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 1000, date: "2026-01-01" })],
      expenses: [expense({ amount: 1500, category: "food", date: "2026-04-10" })],
    });
    expect(result.some((i) => i.id === "predict-overshoot" && i.level === "critical")).toBe(true);
  });
});

describe("generateInsights — output shape", () => {
  it("returns insights pre-sorted by severity", () => {
    const result = generateInsights({
      ...baseArgs,
      incomes: [income({ frequency: "monthly", amount: 1000, date: "2026-01-01" })],
      expenses: [expense({ amount: 1500, category: "food", date: "2026-04-10" })],
      budgets: [
        { id: "b1", userId: "u", category: "food", limit: 500, period: "monthly" },
      ],
    });
    // The first element must have a higher-or-equal severity than the rest.
    const weights = { critical: 4, warning: 3, info: 2, positive: 1 } as const;
    let prev = Infinity;
    for (const i of result) {
      const w = weights[i.level];
      expect(w).toBeLessThanOrEqual(prev);
      prev = w;
    }
  });
});
