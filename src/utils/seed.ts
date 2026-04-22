import { addDays, formatISO, subDays } from "date-fns";
import type { Budget, Expense, Goal, Income, Subscription } from "@/types";

/**
 * Demo dataset used before auth / when Firebase isn't configured yet.
 * Keeps the landing → dashboard flow interactive from the first click.
 */
export function buildSeed(userId = "demo-user") {
  const today = new Date();
  const iso = (d: Date) => formatISO(d, { representation: "date" });

  const incomes: Income[] = [
    {
      id: "i1",
      userId,
      amount: 5200,
      category: "salary",
      frequency: "monthly",
      date: iso(subDays(today, 92)),
      description: "Monthly salary",
    },
    { id: "i2", userId, amount: 850, category: "freelance", frequency: "once", date: iso(subDays(today, 12)), description: "Logo design" },
    { id: "i6", userId, amount: 420, category: "investment", frequency: "once", date: iso(subDays(today, 18)), description: "ETF dividends" },
  ];

  const expenses: Expense[] = [
    { id: "e1", userId, amount: 1400, type: "fixed", category: "housing", date: iso(subDays(today, 1)), description: "Rent" },
    { id: "e2", userId, amount: 420, type: "variable", category: "food", date: iso(subDays(today, 3)), description: "Groceries" },
    { id: "e3", userId, amount: 60, type: "variable", category: "food", date: iso(subDays(today, 6)), description: "Dinner out" },
    { id: "e4", userId, amount: 120, type: "fixed", category: "utilities", date: iso(subDays(today, 8)), description: "Electricity" },
    { id: "e5", userId, amount: 15.99, type: "fixed", category: "subscriptions", date: iso(subDays(today, 4)), description: "Netflix" },
    { id: "e6", userId, amount: 9.99, type: "fixed", category: "subscriptions", date: iso(subDays(today, 4)), description: "Spotify" },
    { id: "e7", userId, amount: 20, type: "fixed", category: "subscriptions", date: iso(subDays(today, 4)), description: "ChatGPT" },
    { id: "e8", userId, amount: 85, type: "variable", category: "transport", date: iso(subDays(today, 7)), description: "Gas" },
    { id: "e9", userId, amount: 220, type: "variable", category: "entertainment", date: iso(subDays(today, 10)), description: "Concert tickets" },
    { id: "e10", userId, amount: 180, type: "variable", category: "shopping", date: iso(subDays(today, 13)), description: "New running shoes" },
    { id: "e11", userId, amount: 1400, type: "fixed", category: "housing", date: iso(subDays(today, 31)), description: "Rent" },
    { id: "e12", userId, amount: 520, type: "variable", category: "food", date: iso(subDays(today, 35)), description: "Groceries" },
    { id: "e13", userId, amount: 110, type: "fixed", category: "utilities", date: iso(subDays(today, 40)), description: "Electricity" },
    { id: "e14", userId, amount: 15.99, type: "fixed", category: "subscriptions", date: iso(subDays(today, 34)), description: "Netflix" },
    { id: "e15", userId, amount: 9.99, type: "fixed", category: "subscriptions", date: iso(subDays(today, 34)), description: "Spotify" },
    { id: "e16", userId, amount: 1400, type: "fixed", category: "housing", date: iso(subDays(today, 61)), description: "Rent" },
    { id: "e17", userId, amount: 450, type: "variable", category: "food", date: iso(subDays(today, 63)), description: "Groceries" },
    { id: "e18", userId, amount: 130, type: "fixed", category: "utilities", date: iso(subDays(today, 70)), description: "Electricity" },
    { id: "e19", userId, amount: 1400, type: "fixed", category: "housing", date: iso(subDays(today, 91)), description: "Rent" },
    { id: "e20", userId, amount: 460, type: "variable", category: "food", date: iso(subDays(today, 95)), description: "Groceries" },
  ];

  const budgets: Budget[] = [
    { id: "b1", userId, category: "food", limit: 600, period: "monthly" },
    { id: "b2", userId, category: "transport", limit: 200, period: "monthly" },
    { id: "b3", userId, category: "entertainment", limit: 250, period: "monthly" },
    { id: "b4", userId, category: "subscriptions", limit: 60, period: "monthly" },
  ];

  const goals: Goal[] = [
    {
      id: "g1",
      userId,
      title: "Emergency fund",
      targetAmount: 10000,
      currentAmount: 4200,
      deadline: iso(addDays(today, 210)),
    },
    {
      id: "g2",
      userId,
      title: "Japan trip",
      targetAmount: 3800,
      currentAmount: 950,
      deadline: iso(addDays(today, 280)),
    },
  ];

  const subscriptions: Subscription[] = [
    { id: "s1", userId, name: "Netflix", amount: 15.99, billingCycle: "monthly", category: "subscriptions" },
    { id: "s2", userId, name: "Spotify", amount: 9.99, billingCycle: "monthly", category: "subscriptions" },
    { id: "s3", userId, name: "ChatGPT", amount: 20, billingCycle: "monthly", category: "subscriptions" },
    { id: "s4", userId, name: "iCloud+", amount: 29, billingCycle: "yearly", category: "subscriptions" },
  ];

  return { incomes, expenses, budgets, goals, subscriptions };
}
