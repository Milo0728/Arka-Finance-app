"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AchievementId =
  | "first-expense"
  | "first-income"
  | "first-budget"
  | "first-goal"
  | "babylon-saver"
  | "streak-7";

export interface Achievement {
  id: AchievementId;
  unlockedAt: string;
}

interface AchievementsState {
  unlocked: Record<AchievementId, Achievement | undefined>;
  /** ISO dates of every distinct day the user opened the app (most recent at index 0). */
  visitDays: string[];
  unlock: (id: AchievementId) => void;
  /** Records "user opened the app today". Idempotent within a calendar day. */
  recordVisit: () => void;
  /** Test/debug helper — wipe achievements without touching real finance data. */
  reset: () => void;
}

const ALL_IDS: AchievementId[] = [
  "first-expense",
  "first-income",
  "first-budget",
  "first-goal",
  "babylon-saver",
  "streak-7",
];

function emptyUnlocked(): Record<AchievementId, Achievement | undefined> {
  return ALL_IDS.reduce((acc, id) => {
    acc[id] = undefined;
    return acc;
  }, {} as Record<AchievementId, Achievement | undefined>);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: emptyUnlocked(),
      visitDays: [],

      unlock: (id) => {
        const current = get().unlocked[id];
        if (current) return; // idempotent — first unlock wins
        set((s) => ({
          unlocked: { ...s.unlocked, [id]: { id, unlockedAt: new Date().toISOString() } },
        }));
      },

      recordVisit: () => {
        const today = todayISO();
        const days = get().visitDays;
        if (days[0] === today) return;
        // Cap to last 30 days — that's enough to compute every streak we care about
        // without unbounded persisted growth.
        const next = [today, ...days.filter((d) => d !== today)].slice(0, 30);
        set({ visitDays: next });
      },

      reset: () => set({ unlocked: emptyUnlocked(), visitDays: [] }),
    }),
    {
      name: "arka-achievements-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/**
 * Counts the longest run of consecutive visit days ending today.
 * Visit days are stored as ISO date strings (YYYY-MM-DD).
 */
export function consecutiveVisitStreak(visitDays: string[]): number {
  if (visitDays.length === 0) return 0;
  const set = new Set(visitDays);
  let streak = 0;
  let cursor = new Date();
  // Walk backward day by day until we find a gap.
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}
