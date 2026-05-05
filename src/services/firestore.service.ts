"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type {
  Account,
  Budget,
  Expense,
  Goal,
  Income,
  Subscription,
  UserProfile,
} from "@/types";

function db() {
  const d = firestore();
  if (!d) throw new Error("Firestore not available. Configure Firebase env vars.");
  return d;
}

const COLLECTIONS = {
  users: "users",
  incomes: "incomes",
  expenses: "expenses",
  budgets: "budgets",
  goals: "goals",
  subscriptions: "subscriptions",
  accounts: "accounts",
} as const;

async function listForUser<T>(collectionName: string, userId: string, extra: QueryConstraint[] = []): Promise<T[]> {
  const ref = collection(db(), collectionName);
  const q = query(ref, where("userId", "==", userId), ...extra);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[];
}

/**
 * Subscribes to a user-scoped query and receives the full result list on every
 * change. Returns an `Unsubscribe` — call it to detach the listener BEFORE the
 * store is reset on logout / uid change, otherwise stale snapshots can write
 * the previous user's data into the (already wiped) store and re-introduce
 * the D4 leak.
 *
 * The listener emits the entire collection on every change. The Firestore SDK
 * still ships only the doc-level deltas over the wire, so the perf cost is
 * O(N) per change in JS only. The store is responsible for skipping `set(...)`
 * when the new array is identical to the previous one (id+updatedAt diff).
 *
 * `onError` is invoked once per error event; the SDK auto-retries the
 * subscription on transient failures, so callers should NOT call unsubscribe
 * from inside `onError`.
 */
function subscribeForUser<T>(
  collectionName: string,
  userId: string,
  onChange: (rows: T[]) => void,
  onError?: (err: Error) => void,
  extra: QueryConstraint[] = []
): Unsubscribe {
  const ref = collection(db(), collectionName);
  const q = query(ref, where("userId", "==", userId), ...extra);
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[];
      onChange(rows);
    },
    (err) => {
      onError?.(err);
    }
  );
}

async function createForUser<T extends { userId: string }>(
  collectionName: string,
  data: Omit<T, "id">,
  preassignedId?: string
): Promise<T> {
  // Strip undefined values — addDoc with ignoreUndefinedProperties=false (our
  // default) would otherwise throw. We drop them on create rather than storing
  // deleteField() sentinels, which only make sense on update.
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) clean[key] = value;
  }
  clean.createdAt = serverTimestamp();
  // When the caller already minted a client-side id (optimistic-update flow),
  // write under that id with setDoc so the eventual snapshot's doc.id matches
  // what's already in the local store — equalByIdAndUpdatedAt will then short
  // -circuit the snapshot's set(...) and there's no swap/flicker.
  if (preassignedId) {
    await setDoc(doc(db(), collectionName, preassignedId), clean as DocumentData);
    return { ...data, id: preassignedId } as unknown as T;
  }
  const ref = collection(db(), collectionName);
  const created = await addDoc(ref, clean as DocumentData);
  return { ...data, id: created.id } as unknown as T;
}

async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  // Firestore's updateDoc rejects raw `undefined` values — but callers use
  // `undefined` naturally to mean "clear this field" (e.g. unlinking an
  // account or subscription). Translate undefineds into deleteField() so the
  // write succeeds AND the field actually goes away on the backend.
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    clean[key] = value === undefined ? deleteField() : value;
  }
  await updateDoc(doc(db(), collectionName, id), clean as DocumentData);
}

async function removeDocument(collectionName: string, id: string) {
  await deleteDoc(doc(db(), collectionName, id));
}

// Users
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), COLLECTIONS.users, userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as DocumentData) } as UserProfile;
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const { id, ...data } = profile;
  await setDoc(doc(db(), COLLECTIONS.users, id), { ...data }, { merge: true });
}

// Incomes
export const incomeService = {
  list: (userId: string) => listForUser<Income>(COLLECTIONS.incomes, userId, [orderBy("date", "desc")]),
  subscribe: (userId: string, onChange: (rows: Income[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Income>(COLLECTIONS.incomes, userId, onChange, onError, [orderBy("date", "desc")]),
  create: (data: Omit<Income, "id">, id?: string) =>
    createForUser<Income>(COLLECTIONS.incomes, data, id),
  update: (id: string, data: Partial<Income>) => updateDocument<Income>(COLLECTIONS.incomes, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.incomes, id),
};

// Expenses
export const expenseService = {
  list: (userId: string) => listForUser<Expense>(COLLECTIONS.expenses, userId, [orderBy("date", "desc")]),
  subscribe: (userId: string, onChange: (rows: Expense[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Expense>(COLLECTIONS.expenses, userId, onChange, onError, [orderBy("date", "desc")]),
  create: (data: Omit<Expense, "id">, id?: string) =>
    createForUser<Expense>(COLLECTIONS.expenses, data, id),
  update: (id: string, data: Partial<Expense>) => updateDocument<Expense>(COLLECTIONS.expenses, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.expenses, id),
};

// Budgets
export const budgetService = {
  list: (userId: string) => listForUser<Budget>(COLLECTIONS.budgets, userId),
  subscribe: (userId: string, onChange: (rows: Budget[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Budget>(COLLECTIONS.budgets, userId, onChange, onError),
  create: (data: Omit<Budget, "id">, id?: string) =>
    createForUser<Budget>(COLLECTIONS.budgets, data, id),
  update: (id: string, data: Partial<Budget>) => updateDocument<Budget>(COLLECTIONS.budgets, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.budgets, id),
};

// Goals
export const goalService = {
  list: (userId: string) => listForUser<Goal>(COLLECTIONS.goals, userId),
  subscribe: (userId: string, onChange: (rows: Goal[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Goal>(COLLECTIONS.goals, userId, onChange, onError),
  create: (data: Omit<Goal, "id">, id?: string) =>
    createForUser<Goal>(COLLECTIONS.goals, data, id),
  update: (id: string, data: Partial<Goal>) => updateDocument<Goal>(COLLECTIONS.goals, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.goals, id),
};

// Subscriptions
export const subscriptionService = {
  list: (userId: string) => listForUser<Subscription>(COLLECTIONS.subscriptions, userId),
  subscribe: (userId: string, onChange: (rows: Subscription[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Subscription>(COLLECTIONS.subscriptions, userId, onChange, onError),
  create: (data: Omit<Subscription, "id">, id?: string) =>
    createForUser<Subscription>(COLLECTIONS.subscriptions, data, id),
  update: (id: string, data: Partial<Subscription>) =>
    updateDocument<Subscription>(COLLECTIONS.subscriptions, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.subscriptions, id),
};

// Accounts
export const accountService = {
  list: (userId: string) => listForUser<Account>(COLLECTIONS.accounts, userId),
  subscribe: (userId: string, onChange: (rows: Account[]) => void, onError?: (err: Error) => void) =>
    subscribeForUser<Account>(COLLECTIONS.accounts, userId, onChange, onError),
  create: (data: Omit<Account, "id">, id?: string) =>
    createForUser<Account>(COLLECTIONS.accounts, data, id),
  update: (id: string, data: Partial<Account>) => updateDocument<Account>(COLLECTIONS.accounts, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.accounts, id),
};

// Re-export `Unsubscribe` so the store can type its bookkeeping array without
// pulling firebase/firestore directly.
export type { Unsubscribe };
