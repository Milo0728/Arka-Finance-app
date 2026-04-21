"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type {
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
} as const;

async function listForUser<T>(collectionName: string, userId: string, extra: QueryConstraint[] = []): Promise<T[]> {
  const ref = collection(db(), collectionName);
  const q = query(ref, where("userId", "==", userId), ...extra);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[];
}

async function createForUser<T extends { userId: string }>(
  collectionName: string,
  data: Omit<T, "id">
): Promise<T> {
  const ref = collection(db(), collectionName);
  const created = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  return { ...data, id: created.id } as T;
}

async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  await updateDoc(doc(db(), collectionName, id), data as DocumentData);
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
  create: (data: Omit<Income, "id">) => createForUser<Income>(COLLECTIONS.incomes, data),
  update: (id: string, data: Partial<Income>) => updateDocument<Income>(COLLECTIONS.incomes, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.incomes, id),
};

// Expenses
export const expenseService = {
  list: (userId: string) => listForUser<Expense>(COLLECTIONS.expenses, userId, [orderBy("date", "desc")]),
  create: (data: Omit<Expense, "id">) => createForUser<Expense>(COLLECTIONS.expenses, data),
  update: (id: string, data: Partial<Expense>) => updateDocument<Expense>(COLLECTIONS.expenses, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.expenses, id),
};

// Budgets
export const budgetService = {
  list: (userId: string) => listForUser<Budget>(COLLECTIONS.budgets, userId),
  create: (data: Omit<Budget, "id">) => createForUser<Budget>(COLLECTIONS.budgets, data),
  update: (id: string, data: Partial<Budget>) => updateDocument<Budget>(COLLECTIONS.budgets, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.budgets, id),
};

// Goals
export const goalService = {
  list: (userId: string) => listForUser<Goal>(COLLECTIONS.goals, userId),
  create: (data: Omit<Goal, "id">) => createForUser<Goal>(COLLECTIONS.goals, data),
  update: (id: string, data: Partial<Goal>) => updateDocument<Goal>(COLLECTIONS.goals, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.goals, id),
};

// Subscriptions
export const subscriptionService = {
  list: (userId: string) => listForUser<Subscription>(COLLECTIONS.subscriptions, userId),
  create: (data: Omit<Subscription, "id">) => createForUser<Subscription>(COLLECTIONS.subscriptions, data),
  update: (id: string, data: Partial<Subscription>) =>
    updateDocument<Subscription>(COLLECTIONS.subscriptions, id, data),
  remove: (id: string) => removeDocument(COLLECTIONS.subscriptions, id),
};
