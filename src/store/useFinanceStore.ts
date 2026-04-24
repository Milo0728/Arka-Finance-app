"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account,
  Budget,
  Currency,
  Expense,
  Goal,
  Income,
  Subscription,
  UserProfile,
} from "@/types";
import { buildSeed } from "@/utils/seed";
import { isFirebaseConfigured } from "@/lib/firebase";
import { FALLBACK_RATES, fetchRates } from "@/lib/exchange";
import {
  accountService,
  budgetService,
  expenseService,
  goalService,
  incomeService,
  subscriptionService,
  upsertUserProfile,
} from "@/services/firestore.service";

type Collections = "incomes" | "expenses" | "budgets" | "goals" | "subscriptions" | "accounts";

interface FinanceState {
  profile: UserProfile | null;
  /** User's chosen *display* currency. All stored amounts are in USD. */
  currency: Currency;
  rates: Record<Currency, number>;
  ratesUpdatedAt: string | null;
  ratesSource: "live" | "fallback";
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  accounts: Account[];
  /** UI selection (id of an account or null for "all consolidated"). Not persisted to Firestore. */
  activeAccountId: string | null;
  hydrated: boolean;
  usingLocalSeed: boolean;
  loading: Partial<Record<Collections | "bootstrap" | "rates", boolean>>;
  setProfile: (profile: UserProfile | null) => void;
  setCurrency: (currency: Currency) => void;
  setActiveAccountId: (id: string | null) => void;
  loadRates: (force?: boolean) => Promise<void>;
  bootstrap: (userId: string) => Promise<void>;
  hydrateSeed: () => void;
  // Income
  addIncome: (data: Omit<Income, "id">) => Promise<Income>;
  updateIncome: (id: string, data: Partial<Income>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  // Expense
  addExpense: (data: Omit<Expense, "id">) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  // Budgets
  addBudget: (data: Omit<Budget, "id">) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  // Goals
  addGoal: (data: Omit<Goal, "id">) => Promise<Goal>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  // Subs
  addSubscription: (data: Omit<Subscription, "id">) => Promise<Subscription>;
  updateSubscription: (id: string, data: Partial<Subscription>) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  // Accounts
  addAccount: (data: Omit<Account, "id">) => Promise<Account>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  reset: () => void;
}

function generateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      profile: null,
      currency: (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as Currency) ?? "USD",
      rates: { ...FALLBACK_RATES },
      ratesUpdatedAt: null,
      ratesSource: "fallback",
      incomes: [],
      expenses: [],
      budgets: [],
      goals: [],
      subscriptions: [],
      accounts: [],
      activeAccountId: null,
      hydrated: false,
      usingLocalSeed: false,
      loading: {},

      setProfile: (profile) => set({ profile }),
      setCurrency: (currency) => set({ currency }),
      setActiveAccountId: (id) => set({ activeAccountId: id }),

      loadRates: async (force = false) => {
        const state = get();
        const stale =
          !state.ratesUpdatedAt ||
          Date.now() - new Date(state.ratesUpdatedAt).getTime() > 6 * 60 * 60 * 1000;
        if (!force && !stale && state.ratesSource === "live") return;
        set((s) => ({ loading: { ...s.loading, rates: true } }));
        try {
          const { rates, fetchedAt, source } = await fetchRates();
          set({ rates, ratesUpdatedAt: fetchedAt, ratesSource: source });
        } finally {
          set((s) => ({ loading: { ...s.loading, rates: false } }));
        }
      },

      hydrateSeed: () => {
        if (get().hydrated) return;
        const seed = buildSeed(get().profile?.id ?? "demo-user");
        set({ ...seed, hydrated: true, usingLocalSeed: true });
      },

      bootstrap: async (userId) => {
        if (!isFirebaseConfigured) {
          get().hydrateSeed();
          return;
        }
        // Wipe any stale local seed before fetching real data, so users signing
        // in for the first time never see demo content they didn't create.
        set((s) => ({
          incomes: s.usingLocalSeed ? [] : s.incomes,
          expenses: s.usingLocalSeed ? [] : s.expenses,
          budgets: s.usingLocalSeed ? [] : s.budgets,
          goals: s.usingLocalSeed ? [] : s.goals,
          subscriptions: s.usingLocalSeed ? [] : s.subscriptions,
          accounts: s.usingLocalSeed ? [] : s.accounts,
          usingLocalSeed: false,
          loading: { ...s.loading, bootstrap: true },
        }));
        try {
          const [incomes, expenses, budgets, goals, subscriptions, accounts] = await Promise.all([
            incomeService.list(userId),
            expenseService.list(userId),
            budgetService.list(userId),
            goalService.list(userId),
            subscriptionService.list(userId),
            accountService.list(userId),
          ]);
          set({
            incomes,
            expenses,
            budgets,
            goals,
            subscriptions,
            accounts,
            hydrated: true,
            usingLocalSeed: false,
          });
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Arka] bootstrap failed:", err);
          }
          set({ hydrated: true });
        } finally {
          set((s) => ({ loading: { ...s.loading, bootstrap: false } }));
        }
      },

      addIncome: async (data) => {
        if (isFirebaseConfigured) {
          const created = await incomeService.create(data);
          set((s) => ({ incomes: [created, ...s.incomes] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Income;
        set((s) => ({ incomes: [created, ...s.incomes] }));
        return created;
      },
      updateIncome: async (id, data) => {
        if (isFirebaseConfigured) await incomeService.update(id, data);
        set((s) => ({ incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
      },
      removeIncome: async (id) => {
        if (isFirebaseConfigured) await incomeService.remove(id);
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
      },

      addExpense: async (data) => {
        if (isFirebaseConfigured) {
          const created = await expenseService.create(data);
          set((s) => ({ expenses: [created, ...s.expenses] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Expense;
        set((s) => ({ expenses: [created, ...s.expenses] }));
        return created;
      },
      updateExpense: async (id, data) => {
        if (isFirebaseConfigured) await expenseService.update(id, data);
        set((s) => ({ expenses: s.expenses.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
      },
      removeExpense: async (id) => {
        if (isFirebaseConfigured) await expenseService.remove(id);
        set((s) => ({ expenses: s.expenses.filter((i) => i.id !== id) }));
      },

      addBudget: async (data) => {
        if (isFirebaseConfigured) {
          const created = await budgetService.create(data);
          set((s) => ({ budgets: [...s.budgets, created] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Budget;
        set((s) => ({ budgets: [...s.budgets, created] }));
        return created;
      },
      updateBudget: async (id, data) => {
        if (isFirebaseConfigured) await budgetService.update(id, data);
        set((s) => ({ budgets: s.budgets.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
      },
      removeBudget: async (id) => {
        if (isFirebaseConfigured) await budgetService.remove(id);
        set((s) => ({ budgets: s.budgets.filter((i) => i.id !== id) }));
      },

      addGoal: async (data) => {
        if (isFirebaseConfigured) {
          const created = await goalService.create(data);
          set((s) => ({ goals: [...s.goals, created] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Goal;
        set((s) => ({ goals: [...s.goals, created] }));
        return created;
      },
      updateGoal: async (id, data) => {
        if (isFirebaseConfigured) await goalService.update(id, data);
        set((s) => ({ goals: s.goals.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
      },
      removeGoal: async (id) => {
        if (isFirebaseConfigured) await goalService.remove(id);
        set((s) => ({ goals: s.goals.filter((i) => i.id !== id) }));
      },

      addSubscription: async (data) => {
        if (isFirebaseConfigured) {
          const created = await subscriptionService.create(data);
          set((s) => ({ subscriptions: [...s.subscriptions, created] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Subscription;
        set((s) => ({ subscriptions: [...s.subscriptions, created] }));
        return created;
      },
      updateSubscription: async (id, data) => {
        if (isFirebaseConfigured) await subscriptionService.update(id, data);
        set((s) => ({
          subscriptions: s.subscriptions.map((i) => (i.id === id ? { ...i, ...data } : i)),
        }));
      },
      removeSubscription: async (id) => {
        if (isFirebaseConfigured) await subscriptionService.remove(id);
        set((s) => ({ subscriptions: s.subscriptions.filter((i) => i.id !== id) }));
      },

      addAccount: async (data) => {
        if (isFirebaseConfigured) {
          const created = await accountService.create(data);
          set((s) => ({ accounts: [...s.accounts, created] }));
          return created;
        }
        const created = { ...data, id: generateId() } as Account;
        set((s) => ({ accounts: [...s.accounts, created] }));
        return created;
      },
      updateAccount: async (id, data) => {
        if (isFirebaseConfigured) await accountService.update(id, data);
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)) }));
      },
      removeAccount: async (id) => {
        if (isFirebaseConfigured) await accountService.remove(id);
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          // If the user just deleted the account they were filtering on, fall back to "all".
          activeAccountId: s.activeAccountId === id ? null : s.activeAccountId,
        }));
      },

      reset: () =>
        set({
          profile: null,
          incomes: [],
          expenses: [],
          budgets: [],
          goals: [],
          subscriptions: [],
          accounts: [],
          activeAccountId: null,
          hydrated: false,
          usingLocalSeed: false,
          rates: { ...FALLBACK_RATES },
          ratesUpdatedAt: null,
          ratesSource: "fallback",
        }),
    }),
    {
      name: "arka-finance-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        profile: state.profile,
        currency: state.currency,
        rates: state.rates,
        ratesUpdatedAt: state.ratesUpdatedAt,
        ratesSource: state.ratesSource,
        incomes: state.incomes,
        expenses: state.expenses,
        budgets: state.budgets,
        goals: state.goals,
        subscriptions: state.subscriptions,
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
        hydrated: state.hydrated,
        usingLocalSeed: state.usingLocalSeed,
      }),
      // Bump version when extending the schema so persisted state from older builds
      // is loaded through the migration path instead of crashing on missing keys.
      version: 2,
      migrate: (persisted, version) => {
        // v1 → v2: introduce `accounts` and `activeAccountId`. Older payloads simply
        // didn't have them; default to safe empties so the store stays compatible.
        const next = { ...(persisted as Record<string, unknown> | null ?? {}) };
        if (version < 2) {
          if (!Array.isArray(next.accounts)) next.accounts = [];
          if (typeof next.activeAccountId === "undefined") next.activeAccountId = null;
        }
        return next as unknown as FinanceState;
      },
    }
  )
);

export async function persistProfile(profile: UserProfile) {
  if (!isFirebaseConfigured) return;
  // Firestore rejects undefined values with setDoc — strip them before writing.
  const clean = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => v !== undefined)
  ) as UserProfile;
  await upsertUserProfile(clean);
}
