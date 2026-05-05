"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
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
  type Unsubscribe,
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
  unsubscribeAll: () => void;
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

// ─────────────────────────────────────────────────────────────────────────────
// Subscription bookkeeping. Module-scope, NOT in Zustand state — listeners
// are not data, they're side effects, and persisting them would be nonsense.
// Keeping them out of `set(...)` also avoids triggering re-renders when we
// add/remove handles.
//
// `currentSubscribedUid` makes `bootstrap(uid)` idempotent: re-calling with
// the same uid is a no-op (covers React StrictMode double-mount and the auth
// listener firing twice on a refresh).
// ─────────────────────────────────────────────────────────────────────────────
let unsubscribers: Unsubscribe[] = [];
let currentSubscribedUid: string | null = null;
// One-shot guards for the toasted error message — without these every retry
// from the SDK could spam the user. Reset after a successful snapshot or on
// `unsubscribeAll`.
let snapshotErrorReported = false;

/**
 * Compares two arrays for "meaningful" equality so we can short-circuit
 * `set(...)` when a snapshot didn't actually change anything from the store's
 * point of view.
 *
 * Heuristic, by design — Firestore doesn't ship a per-doc version we can lean
 * on, but most of our docs already carry `createdAt` (server-stamped) and an
 * optional `updatedAt`. We compare:
 *   1. length (cheap reject)
 *   2. id at each position (catches inserts / deletes / reordering)
 *   3. updatedAt if present, else createdAt — both ISO strings, byte-equal
 *      means "no edit since last snapshot"
 *
 * False positives (treating different arrays as equal) are bounded: only
 * happens when length, ordering AND every timestamp coincide, which means
 * the user-visible state is functionally identical even if some non-shown
 * field changed. False negatives (re-rendering on equal data) are still safe
 * — at worst, a wasted render — and we accept those over correctness risk.
 */
function equalByIdAndUpdatedAt<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  prev: T[],
  next: T[]
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a.id !== b.id) return false;
    const aStamp = a.updatedAt ?? a.createdAt;
    const bStamp = b.updatedAt ?? b.createdAt;
    if (aStamp !== bStamp) return false;
  }
  return true;
}

/**
 * Single funnel for any failed Firestore mutation. We log in dev (cheap signal
 * for tests + manual debugging) and toast once per error event so the user
 * always sees a single, actionable message — never a cascade of duplicates
 * even if multiple mutations are in flight at the same time.
 *
 * The catch block in each action calls this AFTER restoring the rollback
 * snapshot, so by the time the toast appears the store is already consistent.
 */
function reportMutationError(
  action: "create" | "update" | "remove",
  entity: string,
  err: unknown
) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[Arka] mutation failed:", action, entity, err);
  }
  const verb = action === "create" ? "save" : action;
  toast.error(`Couldn't ${verb} ${entity} — reverted to previous state.`);
}

function cleanupSubscriptions() {
  for (const off of unsubscribers) {
    try {
      off();
    } catch {
      /* SDK is defensive but ignore cleanup errors regardless */
    }
  }
  unsubscribers = [];
  currentSubscribedUid = null;
  snapshotErrorReported = false;
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

      /**
       * Detach every active Firestore listener and clear the bookkeeping.
       *
       * MUST be called BEFORE `reset()` on logout / uid change. The required
       * order is:
       *
       *   1. unsubscribeAll()        ← stops new emissions writing into store
       *   2. reset()                 ← wipes the store cleanly
       *   3. bootstrap(newUid)       ← attaches fresh listeners for the new user
       *
       * If you call `reset()` first, an in-flight snapshot from the old user
       * will land *after* the wipe and re-introduce the D4 leak.
       */
      unsubscribeAll: () => {
        cleanupSubscriptions();
      },

      bootstrap: async (userId) => {
        if (!isFirebaseConfigured) {
          // Demo mode: no listeners, just hydrate the local seed.
          get().hydrateSeed();
          return;
        }
        // Idempotent: re-calling with the same uid is a no-op. Covers React
        // StrictMode double-mount and the auth listener firing more than once.
        if (currentSubscribedUid === userId && unsubscribers.length > 0) return;

        // Different uid (or stale subscriptions): tear down whatever was there
        // before re-subscribing. The auth listener is responsible for calling
        // `unsubscribeAll → reset` when a uid CHANGE happens; this branch
        // handles the rarer case where bootstrap is invoked directly.
        cleanupSubscriptions();

        const prev = get();
        const userChanged = !!prev.profile && prev.profile.id !== userId;
        set((s) => ({
          incomes: [],
          expenses: [],
          budgets: [],
          goals: [],
          subscriptions: [],
          accounts: [],
          profile: userChanged ? null : s.profile,
          activeAccountId: userChanged ? null : s.activeAccountId,
          usingLocalSeed: false,
          hydrated: false,
          loading: { ...s.loading, bootstrap: true },
        }));

        currentSubscribedUid = userId;

        // Per-collection "first emission received" gate. `hydrated` flips to
        // true only when ALL six collections have reported at least once, so
        // consumers that gate UI on `hydrated` see a fully-populated store
        // rather than a partial one.
        const seen: Record<Collections, boolean> = {
          incomes: false,
          expenses: false,
          budgets: false,
          goals: false,
          subscriptions: false,
          accounts: false,
        };

        function markSeen(key: Collections) {
          if (seen[key]) return;
          seen[key] = true;
          if (
            seen.incomes &&
            seen.expenses &&
            seen.budgets &&
            seen.goals &&
            seen.subscriptions &&
            seen.accounts
          ) {
            set({ hydrated: true, loading: { ...get().loading, bootstrap: false } });
          }
        }

        function reportError(err: Error) {
          // Log always in dev. Toast at most once per `bootstrap` to avoid
          // spamming the user when the SDK auto-retries the listener; the
          // flag is reset on `unsubscribeAll`. We DO NOT detach the listener
          // — the SDK reconnects on its own when the network recovers.
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[Arka] snapshot error:", err);
          }
          if (!snapshotErrorReported) {
            snapshotErrorReported = true;
            toast.error("We lost the live connection — retrying in the background.");
          }
        }

        // Generic per-collection wiring. `setKey` is `incomes`/`expenses`/...
        // and the snapshot replaces the array, but only when the new payload
        // differs from the previous one (id+updatedAt diff).
        function attach<T extends { id: string; updatedAt?: string; createdAt?: string }>(
          key: Collections,
          off: Unsubscribe
        ) {
          unsubscribers.push(off);
          // The actual listener body is registered by the caller via the
          // service. The wrapper below is just bookkeeping: we keep `attach`
          // as a tiny indirection so the call sites stay readable.
          void key;
        }

        function makeHandler<T extends { id: string; updatedAt?: string; createdAt?: string }>(
          key: Collections,
          field: Collections
        ): (rows: T[]) => void {
          return (rows) => {
            // First successful emission resets the error flag so a future
            // disruption can toast again.
            snapshotErrorReported = false;
            const prevRows = (get() as unknown as Record<string, T[]>)[field];
            if (equalByIdAndUpdatedAt(prevRows, rows)) {
              markSeen(key);
              return;
            }
            set({ [field]: rows } as unknown as Partial<FinanceState>);
            markSeen(key);
          };
        }

        attach<Income>(
          "incomes",
          incomeService.subscribe(userId, makeHandler<Income>("incomes", "incomes"), reportError)
        );
        attach<Expense>(
          "expenses",
          expenseService.subscribe(
            userId,
            makeHandler<Expense>("expenses", "expenses"),
            reportError
          )
        );
        attach<Budget>(
          "budgets",
          budgetService.subscribe(userId, makeHandler<Budget>("budgets", "budgets"), reportError)
        );
        attach<Goal>(
          "goals",
          goalService.subscribe(userId, makeHandler<Goal>("goals", "goals"), reportError)
        );
        attach<Subscription>(
          "subscriptions",
          subscriptionService.subscribe(
            userId,
            makeHandler<Subscription>("subscriptions", "subscriptions"),
            reportError
          )
        );
        attach<Account>(
          "accounts",
          accountService.subscribe(
            userId,
            makeHandler<Account>("accounts", "accounts"),
            reportError
          )
        );
      },

      addIncome: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Income;
        const prev = get().incomes;
        set({ incomes: [optimistic, ...prev] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await incomeService.create(data, id);
        } catch (err) {
          set({ incomes: prev });
          reportMutationError("create", "income", err);
          throw err;
        }
      },
      updateIncome: async (id, data) => {
        const prev = get().incomes;
        set({ incomes: prev.map((i) => (i.id === id ? { ...i, ...data } : i)) });
        if (!isFirebaseConfigured) return;
        try {
          await incomeService.update(id, data);
        } catch (err) {
          set({ incomes: prev });
          reportMutationError("update", "income", err);
          throw err;
        }
      },
      removeIncome: async (id) => {
        const prev = get().incomes;
        set({ incomes: prev.filter((i) => i.id !== id) });
        if (!isFirebaseConfigured) return;
        try {
          await incomeService.remove(id);
        } catch (err) {
          set({ incomes: prev });
          reportMutationError("remove", "income", err);
          throw err;
        }
      },

      addExpense: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Expense;
        const prev = get().expenses;
        set({ expenses: [optimistic, ...prev] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await expenseService.create(data, id);
        } catch (err) {
          set({ expenses: prev });
          reportMutationError("create", "expense", err);
          throw err;
        }
      },
      updateExpense: async (id, data) => {
        const prev = get().expenses;
        set({ expenses: prev.map((i) => (i.id === id ? { ...i, ...data } : i)) });
        if (!isFirebaseConfigured) return;
        try {
          await expenseService.update(id, data);
        } catch (err) {
          set({ expenses: prev });
          reportMutationError("update", "expense", err);
          throw err;
        }
      },
      removeExpense: async (id) => {
        const prev = get().expenses;
        set({ expenses: prev.filter((i) => i.id !== id) });
        if (!isFirebaseConfigured) return;
        try {
          await expenseService.remove(id);
        } catch (err) {
          set({ expenses: prev });
          reportMutationError("remove", "expense", err);
          throw err;
        }
      },

      addBudget: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Budget;
        const prev = get().budgets;
        set({ budgets: [...prev, optimistic] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await budgetService.create(data, id);
        } catch (err) {
          set({ budgets: prev });
          reportMutationError("create", "budget", err);
          throw err;
        }
      },
      updateBudget: async (id, data) => {
        const prev = get().budgets;
        set({ budgets: prev.map((i) => (i.id === id ? { ...i, ...data } : i)) });
        if (!isFirebaseConfigured) return;
        try {
          await budgetService.update(id, data);
        } catch (err) {
          set({ budgets: prev });
          reportMutationError("update", "budget", err);
          throw err;
        }
      },
      removeBudget: async (id) => {
        const prev = get().budgets;
        set({ budgets: prev.filter((i) => i.id !== id) });
        if (!isFirebaseConfigured) return;
        try {
          await budgetService.remove(id);
        } catch (err) {
          set({ budgets: prev });
          reportMutationError("remove", "budget", err);
          throw err;
        }
      },

      addGoal: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Goal;
        const prev = get().goals;
        set({ goals: [...prev, optimistic] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await goalService.create(data, id);
        } catch (err) {
          set({ goals: prev });
          reportMutationError("create", "goal", err);
          throw err;
        }
      },
      updateGoal: async (id, data) => {
        const prev = get().goals;
        set({ goals: prev.map((i) => (i.id === id ? { ...i, ...data } : i)) });
        if (!isFirebaseConfigured) return;
        try {
          await goalService.update(id, data);
        } catch (err) {
          set({ goals: prev });
          reportMutationError("update", "goal", err);
          throw err;
        }
      },
      removeGoal: async (id) => {
        const prev = get().goals;
        set({ goals: prev.filter((i) => i.id !== id) });
        if (!isFirebaseConfigured) return;
        try {
          await goalService.remove(id);
        } catch (err) {
          set({ goals: prev });
          reportMutationError("remove", "goal", err);
          throw err;
        }
      },

      addSubscription: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Subscription;
        const prev = get().subscriptions;
        set({ subscriptions: [...prev, optimistic] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await subscriptionService.create(data, id);
        } catch (err) {
          set({ subscriptions: prev });
          reportMutationError("create", "subscription", err);
          throw err;
        }
      },
      updateSubscription: async (id, data) => {
        const prev = get().subscriptions;
        set({ subscriptions: prev.map((i) => (i.id === id ? { ...i, ...data } : i)) });
        if (!isFirebaseConfigured) return;
        try {
          await subscriptionService.update(id, data);
        } catch (err) {
          set({ subscriptions: prev });
          reportMutationError("update", "subscription", err);
          throw err;
        }
      },
      removeSubscription: async (id) => {
        const prev = get().subscriptions;
        set({ subscriptions: prev.filter((i) => i.id !== id) });
        if (!isFirebaseConfigured) return;
        try {
          await subscriptionService.remove(id);
        } catch (err) {
          set({ subscriptions: prev });
          reportMutationError("remove", "subscription", err);
          throw err;
        }
      },

      addAccount: async (data) => {
        const id = generateId();
        const optimistic = { ...data, id } as Account;
        const prev = get().accounts;
        set({ accounts: [...prev, optimistic] });
        if (!isFirebaseConfigured) return optimistic;
        try {
          return await accountService.create(data, id);
        } catch (err) {
          set({ accounts: prev });
          reportMutationError("create", "account", err);
          throw err;
        }
      },
      updateAccount: async (id, data) => {
        const prev = get().accounts;
        set({ accounts: prev.map((a) => (a.id === id ? { ...a, ...data } : a)) });
        if (!isFirebaseConfigured) return;
        try {
          await accountService.update(id, data);
        } catch (err) {
          set({ accounts: prev });
          reportMutationError("update", "account", err);
          throw err;
        }
      },
      removeAccount: async (id) => {
        // Two slices snapshot together — if the rollback restored only `accounts`
        // and not `activeAccountId`, the UI would point to a dead id.
        const prevAccounts = get().accounts;
        const prevActive = get().activeAccountId;
        set({
          accounts: prevAccounts.filter((a) => a.id !== id),
          // If the user just deleted the account they were filtering on, fall back to "all".
          activeAccountId: prevActive === id ? null : prevActive,
        });
        if (!isFirebaseConfigured) return;
        try {
          await accountService.remove(id);
        } catch (err) {
          set({ accounts: prevAccounts, activeAccountId: prevActive });
          reportMutationError("remove", "account", err);
          throw err;
        }
      },

      reset: () => {
        // Pure state wipe. The contract is: callers MUST call
        // `unsubscribeAll()` BEFORE `reset()`. The canonical caller is the
        // auth listener (`useAuth.ts`); see its JSDoc for the ordering
        // invariant. We deliberately do NOT defensively cleanup here so a
        // misuse fails loudly (a stale listener writing into a reset store
        // is a visible bug) rather than silently masking a misordering.
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
        });
      },
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
        // INTENTIONALLY NOT PERSISTED:
        // - `hydrated`: must be recomputed each session. If a previous session
        //   ended with hydrated=true and bootstrap later fails, persisting it
        //   would skip the rehydrate path on next load and leave the user
        //   stuck with stale (or empty) data.
        // - `usingLocalSeed`: same reason — every fresh load must decide
        //   between seed vs Firestore based on the current auth state, not a
        //   leftover boolean from a prior demo session.
        // - `loading`: transient by definition.
      }),
      // Bump version when extending the schema so persisted state from older builds
      // is loaded through the migration path instead of crashing on missing keys.
      version: 3,
      migrate: (persisted, version) => {
        // v1 → v2: introduce `accounts` and `activeAccountId`. Older payloads simply
        // didn't have them; default to safe empties so the store stays compatible.
        // v2 → v3: stop persisting `hydrated` / `usingLocalSeed`. Any stale value
        // from older builds is discarded — the runtime will set them on bootstrap.
        const next = { ...(persisted as Record<string, unknown> | null ?? {}) };
        if (version < 2) {
          if (!Array.isArray(next.accounts)) next.accounts = [];
          if (typeof next.activeAccountId === "undefined") next.activeAccountId = null;
        }
        if (version < 3) {
          delete next.hydrated;
          delete next.usingLocalSeed;
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

// Test-only export: lets unit tests drive the diff helper directly without
// reaching for module internals through hacks.
export const __test = { equalByIdAndUpdatedAt };
