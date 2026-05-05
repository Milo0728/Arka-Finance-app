import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  babylonSavingsTarget,
  budgetUsage,
  computeHealthScore,
  cycleToMonthly,
  detectPotentialSubscriptions,
  expensesByCategory,
  filterByMonth,
  incomeVsExpenseSeries,
  lifetimeIncome,
  monthlyBalance,
  monthlyEquivalent,
  monthlyExpenses,
  monthlyIncome,
  monthlyIncomeContribution,
  monthlySavingNeeded,
  monthsUntil,
  savingsRate,
  topCategories,
  totalBalance,
  totalMonthlySubscriptions,
} from "@/utils/finance";
import type { Budget, Expense, Goal, Income, Subscription } from "@/types";

// Pin "now" so date-sensitive helpers are deterministic regardless of when CI runs.
const NOW = new Date("2026-04-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: overrides.id ?? "e",
    userId: "u1",
    amount: 100,
    category: "food",
    type: "variable",
    date: "2026-04-10",
    ...overrides,
  };
}

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: overrides.id ?? "i",
    userId: "u1",
    amount: 1000,
    category: "salary",
    date: "2026-04-01",
    ...overrides,
  };
}

describe("cycleToMonthly", () => {
  it("normalises every billing cycle to a monthly equivalent", () => {
    expect(cycleToMonthly(100, "monthly")).toBe(100);
    expect(cycleToMonthly(100, "yearly")).toBeCloseTo(8.333, 3);
    expect(cycleToMonthly(120, "quarterly")).toBe(40);
    expect(cycleToMonthly(10, "weekly")).toBeCloseTo(43.3, 1);
  });
});

describe("monthlyIncomeContribution", () => {
  it("only counts a one-off income in its exact month", () => {
    const i = income({ frequency: "once", amount: 500, date: "2026-04-10" });
    expect(monthlyIncomeContribution(i, NOW)).toBe(500);
    // Mid-month dates avoid TZ ambiguity around month boundaries.
    expect(monthlyIncomeContribution(i, new Date("2026-05-15"))).toBe(0);
    expect(monthlyIncomeContribution(i, new Date("2026-03-15"))).toBe(0);
  });

  it("treats undefined frequency as 'once' (legacy compat)", () => {
    const i = income({ amount: 500, date: "2026-04-10" });
    delete (i as { frequency?: unknown }).frequency;
    expect(monthlyIncomeContribution(i, NOW)).toBe(500);
  });

  it("prorates a recurring income only from its start month onwards", () => {
    const i = income({ frequency: "monthly", amount: 1200, date: "2026-04-01" });
    expect(monthlyIncomeContribution(i, NOW)).toBe(1200);
    // Before start → contributes nothing.
    expect(monthlyIncomeContribution(i, new Date("2026-01-01"))).toBe(0);
  });

  it("converts a yearly cadence into a monthly slice", () => {
    const i = income({ frequency: "yearly", amount: 12000, date: "2026-01-01" });
    expect(monthlyIncomeContribution(i, NOW)).toBe(1000);
  });
});

describe("monthlyIncome / monthlyExpenses / monthlyBalance", () => {
  it("excludes transfer-category entries from both sides", () => {
    const incomes = [
      income({ id: "i1", amount: 5000, frequency: "monthly", date: "2026-04-01" }),
      // Transfer income should be ignored.
      income({ id: "i2", amount: 999, category: "transfer", date: "2026-04-05" }),
    ];
    const expenses = [
      expense({ id: "e1", amount: 1000, date: "2026-04-02" }),
      // Transfer expense should be ignored.
      expense({ id: "e2", amount: 999, category: "transfer", date: "2026-04-03" }),
    ];

    expect(monthlyIncome(incomes, NOW)).toBe(5000);
    expect(monthlyExpenses(expenses, NOW)).toBe(1000);
    expect(monthlyBalance(incomes, expenses, NOW)).toBe(4000);
  });

  it("sums multiple incomes correctly", () => {
    const incomes = [
      income({ id: "i1", amount: 3000, frequency: "monthly", date: "2026-01-01" }),
      income({ id: "i2", amount: 200, frequency: "once", date: "2026-04-05" }),
    ];
    expect(monthlyIncome(incomes, NOW)).toBe(3200);
  });
});

describe("filterByMonth", () => {
  it("only keeps items whose date falls in the reference month", () => {
    const items = [
      { date: "2026-04-01" },
      { date: "2026-04-30" },
      { date: "2026-05-01" },
    ];
    expect(filterByMonth(items, NOW)).toHaveLength(2);
  });
});

describe("lifetimeIncome / totalBalance", () => {
  it("extrapolates a recurring income across elapsed months", () => {
    const i = income({
      frequency: "monthly",
      amount: 1000,
      date: "2026-01-01",
    });
    // Jan, Feb, Mar, Apr → 4 months.
    expect(lifetimeIncome([i], NOW)).toBe(4000);
  });

  it("counts a one-off income exactly once", () => {
    const i = income({ frequency: "once", amount: 1500, date: "2026-02-01" });
    expect(lifetimeIncome([i], NOW)).toBe(1500);
  });

  it("totalBalance subtracts non-transfer expenses from lifetime income", () => {
    const incomes = [
      income({ frequency: "once", amount: 5000, date: "2026-01-01" }),
    ];
    const expenses = [
      expense({ amount: 1000 }),
      expense({ id: "e2", amount: 999, category: "transfer" }),
    ];
    expect(totalBalance(incomes, expenses)).toBe(4000);
  });
});

describe("savingsRate / babylonSavingsTarget", () => {
  it("returns 0 when income is non-positive", () => {
    expect(savingsRate(0, 100)).toBe(0);
    expect(savingsRate(-100, 100)).toBe(0);
  });

  it("clamps negative savings to 0", () => {
    expect(savingsRate(1000, 1500)).toBe(0);
  });

  it("computes percentage when income > expenses", () => {
    expect(savingsRate(1000, 800)).toBe(20);
  });

  it("babylon target is 10% of income by default", () => {
    expect(babylonSavingsTarget(2000)).toBe(200);
    expect(babylonSavingsTarget(2000, 0.2)).toBe(400);
  });
});

describe("expensesByCategory / topCategories", () => {
  it("groups by category and skips transfers", () => {
    const expenses = [
      expense({ id: "1", amount: 100, category: "food" }),
      expense({ id: "2", amount: 200, category: "food" }),
      expense({ id: "3", amount: 50, category: "transport" }),
      expense({ id: "4", amount: 9999, category: "transfer" }),
    ];
    const grouped = expensesByCategory(expenses);
    expect(grouped.food).toBe(300);
    expect(grouped.transport).toBe(50);
    expect(grouped.transfer).toBeUndefined();
  });

  it("topCategories returns sorted slice", () => {
    const expenses = [
      expense({ id: "1", amount: 100, category: "food" }),
      expense({ id: "2", amount: 500, category: "housing" }),
      expense({ id: "3", amount: 50, category: "transport" }),
    ];
    const top = topCategories(expenses, 2);
    expect(top.map((t) => t.category)).toEqual(["housing", "food"]);
  });
});

describe("incomeVsExpenseSeries", () => {
  it("returns N consecutive monthly buckets ending at 'now'", () => {
    const incomes = [
      income({ frequency: "monthly", amount: 1000, date: "2026-01-01" }),
    ];
    const expenses = [expense({ amount: 200, date: "2026-04-10" })];
    const series = incomeVsExpenseSeries(incomes, expenses, 6);
    expect(series).toHaveLength(6);
    expect(series.at(-1)?.income).toBe(1000);
    expect(series.at(-1)?.expense).toBe(200);
    expect(series.at(-1)?.savings).toBe(800);
  });
});

describe("monthsUntil / monthlySavingNeeded", () => {
  it("monthsUntil never returns negative", () => {
    expect(monthsUntil("2026-01-01")).toBe(0);
    expect(monthsUntil("2026-10-15")).toBe(6);
  });

  it("monthlySavingNeeded falls back to remaining when deadline is past", () => {
    const goal: Goal = {
      id: "g1",
      userId: "u1",
      title: "Past goal",
      targetAmount: 1000,
      currentAmount: 200,
      deadline: "2026-01-01",
    };
    expect(monthlySavingNeeded(goal)).toBe(800);
  });

  it("monthlySavingNeeded splits remaining over months remaining", () => {
    const goal: Goal = {
      id: "g2",
      userId: "u1",
      title: "Future",
      targetAmount: 1000,
      currentAmount: 200,
      deadline: "2026-08-15",
    };
    // 4 months between Apr 15 and Aug 15.
    expect(monthlySavingNeeded(goal)).toBe(200);
  });
});

describe("monthlyEquivalent / totalMonthlySubscriptions", () => {
  it("converts each subscription to its monthly equivalent", () => {
    const subs: Subscription[] = [
      { id: "s1", userId: "u1", name: "Yearly", amount: 120, billingCycle: "yearly" },
      { id: "s2", userId: "u1", name: "Monthly", amount: 10, billingCycle: "monthly" },
    ];
    expect(monthlyEquivalent(subs[0])).toBe(10);
    expect(monthlyEquivalent(subs[1])).toBe(10);
    expect(totalMonthlySubscriptions(subs)).toBe(20);
  });
});

describe("budgetUsage", () => {
  it("ignores expenses outside the reference month", () => {
    const budget: Budget = {
      id: "b1",
      userId: "u1",
      category: "food",
      limit: 500,
      period: "monthly",
    };
    const expenses = [
      expense({ id: "1", amount: 100, category: "food", date: "2026-04-10" }),
      expense({ id: "2", amount: 100, category: "food", date: "2026-03-31" }),
      expense({ id: "3", amount: 100, category: "transport", date: "2026-04-12" }),
    ];
    const u = budgetUsage(expenses, budget, NOW);
    expect(u.used).toBe(100);
    expect(u.limit).toBe(500);
    expect(u.pct).toBe(20);
  });

  it("returns pct=0 when limit is zero (no division by zero)", () => {
    const budget: Budget = {
      id: "b2",
      userId: "u1",
      category: "food",
      limit: 0,
      period: "monthly",
    };
    const u = budgetUsage([expense({ amount: 100, category: "food" })], budget, NOW);
    expect(u.pct).toBe(0);
  });
});

describe("computeHealthScore", () => {
  it("returns a stable score with empty data using the documented neutral defaults", () => {
    const r = computeHealthScore({ incomes: [], expenses: [], budgets: [], goals: [] });
    // income=0 → savings=0, ratio treated as 100 → spendingScore=70.
    // Defaults: budgetAdherence=75, goalProgress=50.
    // score = 0*0.4 + 70*0.3 + 75*0.2 + 50*0.1 = 41 → tier "poor".
    expect(r.score).toBe(41);
    expect(r.tier).toBe("poor");
    expect(r.budgetAdherence).toBe(75);
    expect(r.goalProgress).toBe(50);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("rewards a healthy savings rate", () => {
    const incomes = [income({ frequency: "monthly", amount: 5000, date: "2026-01-01" })];
    const expenses = [expense({ amount: 1500, date: "2026-04-10" })];
    const r = computeHealthScore({ incomes, expenses, budgets: [], goals: [] });
    expect(r.savingsRate).toBeCloseTo(70, 0);
    expect(r.score).toBeGreaterThan(70);
  });

  it("penalises overshoot of budgets", () => {
    const incomes = [income({ frequency: "monthly", amount: 1000, date: "2026-01-01" })];
    const overspending = [expense({ amount: 2000, category: "food", date: "2026-04-10" })];
    const tightBudget: Budget = {
      id: "b1",
      userId: "u1",
      category: "food",
      limit: 100,
      period: "monthly",
    };
    const r = computeHealthScore({
      incomes,
      expenses: overspending,
      budgets: [tightBudget],
      goals: [],
    });
    expect(r.budgetAdherence).toBe(0);
    expect(r.tier === "critical" || r.tier === "poor").toBe(true);
  });
});

describe("detectPotentialSubscriptions", () => {
  it("flags repeating same-amount expenses with the same description", () => {
    const expenses = [
      expense({ id: "1", amount: 9.99, description: "Spotify", date: "2026-02-10" }),
      expense({ id: "2", amount: 9.99, description: "Spotify", date: "2026-03-10" }),
      expense({ id: "3", amount: 9.99, description: "Spotify", date: "2026-04-10" }),
      expense({ id: "4", amount: 50, description: "Random", date: "2026-04-05" }),
    ];
    const result = detectPotentialSubscriptions(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("ignores unique entries and entries without description", () => {
    const expenses = [
      expense({ id: "1", description: "Lonely", amount: 10 }),
      expense({ id: "2", description: "", amount: 10 }),
    ];
    expect(detectPotentialSubscriptions(expenses)).toEqual([]);
  });
});
