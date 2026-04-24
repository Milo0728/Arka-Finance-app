"use client";

import { create } from "zustand";

/**
 * Global on/off for the changelog modal. Kept as a standalone store so
 * anything in the tree (sidebar badge, auto-opener, debug tools) can flip
 * it without prop-drilling through layout → children.
 *
 * Not persisted — session-only state. The "did I see this version?" decision
 * lives in localStorage and is handled by the auto-opener effect, not here.
 */
interface ChangelogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useChangelogStore = create<ChangelogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
