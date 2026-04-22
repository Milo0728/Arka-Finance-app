"use client";

import { create } from "zustand";
import { saveProfilePreferences } from "@/hooks/usePreferences";
import { COOKIE_KEYS, setCookie } from "@/lib/preferences";

/**
 * Bump this when the tutorial changes enough that returning users should see
 * it again. The auto-trigger only skips users whose saved `tutorialVersion`
 * matches this number, so raising it re-onboards everyone on their next
 * dashboard visit.
 */
export const TUTORIAL_VERSION = 2;

export type TutorialSection =
  // Dashboard sub-tours
  | "overview"
  | "charts"
  | "score"
  | "insights"
  // Per-page tours
  | "income"
  | "expenses"
  | "budgets"
  | "goals"
  | "subscriptions"
  | "insightsPage"
  | "reports"
  | "settings"
  // Meta
  | "done";

/** Ordered sub-tours that make up the full walkthrough. */
export const FULL_QUEUE: TutorialSection[] = [
  "overview",
  "charts",
  "score",
  "income",
  "expenses",
  "budgets",
  "goals",
  "subscriptions",
  "insightsPage",
  "reports",
  "settings",
  "done",
];

interface TutorialState {
  running: boolean;
  section: TutorialSection | null;
  /** Sub-tours left to run. The head is the active one (== `section`). */
  queue: TutorialSection[];
  queueIndex: number;
  isFullTour: boolean;
  /** Start a single sub-tour or the full walkthrough (`full`). */
  start: (section: TutorialSection | "full") => void;
  /** Called when the current sub-tour closes — advance or finish. */
  advance: () => void;
  /** Hard-stop: skip the rest of the queue. */
  stop: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  running: false,
  section: null,
  queue: [],
  queueIndex: 0,
  isFullTour: false,

  start: (section) => {
    if (section === "full") {
      set({
        running: true,
        queue: [...FULL_QUEUE],
        queueIndex: 0,
        section: FULL_QUEUE[0],
        isFullTour: true,
      });
    } else {
      set({
        running: true,
        queue: [section],
        queueIndex: 0,
        section,
        isFullTour: false,
      });
    }
  },

  advance: () => {
    const state = get();
    if (!state.running) return;
    const nextIndex = state.queueIndex + 1;
    if (nextIndex >= state.queue.length) {
      if (state.isFullTour) {
        setCookie(COOKIE_KEYS.onboarding, String(TUTORIAL_VERSION));
        void saveProfilePreferences({
          onboardingCompleted: true,
          tutorialVersion: TUTORIAL_VERSION,
        });
      }
      set({ running: false, section: null, queue: [], queueIndex: 0, isFullTour: false });
    } else {
      set({ queueIndex: nextIndex, section: state.queue[nextIndex] });
    }
  },

  stop: () => {
    const state = get();
    if (state.isFullTour) {
      setCookie(COOKIE_KEYS.onboarding, "true");
      void saveProfilePreferences({ onboardingCompleted: true });
    }
    set({ running: false, section: null, queue: [], queueIndex: 0, isFullTour: false });
  },
}));
