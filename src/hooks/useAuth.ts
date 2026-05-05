"use client";

import { useEffect } from "react";
import { subscribeAuth } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { persistProfile, useFinanceStore } from "@/store/useFinanceStore";
import { getUserProfile } from "@/services/firestore.service";
import type { UserProfile } from "@/types";

/**
 * Auth listener with the strict transition order required to prevent the
 * D4 leak (one user's snapshot landing in another user's store):
 *
 *   1. unsubscribeAll()    ← stop new server snapshots
 *   2. reset()             ← wipe in-memory + localStorage
 *   3. bootstrap(newUid)   ← attach fresh listeners under the new identity
 *
 * Applies to every transition:
 *   - LOGIN          (null → uid)         steps 1-2 noop, step 3 attaches.
 *   - LOGOUT         (uid → null)         steps 1-2 run, step 3 skipped.
 *   - UID CHANGE     (uidA → uidB)        all three run.
 *   - SAME-UID REFIRE (uidA → uidA)        all three NOOP — handled below.
 *
 * StrictMode / refire safety: every transition is keyed off `lastUid` (a ref
 * inside the effect closure). If the auth callback fires twice with the same
 * uid (StrictMode double-mount, token refresh, tab focus), we short-circuit
 * before doing any teardown. `bootstrap` is also internally idempotent — it
 * checks `currentSubscribedUid` in its module scope and bails if it matches.
 *
 * Concurrency: the callback is async (fetches the profile then calls
 * `bootstrap`). If a second callback fires while the first is still in
 * flight, the second invalidates the first via `generation`. The first sees
 * its generation is no longer current, skips the rest of its work, and returns
 * — guaranteeing only one bootstrap is ever active.
 */
export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const bootstrap = useFinanceStore((s) => s.bootstrap);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const resetFinance = useFinanceStore((s) => s.reset);
  const unsubscribeAll = useFinanceStore((s) => s.unsubscribeAll);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Tracks the currently authoritative session.
    //   - lastUid: which uid the store is meant to be sync'd to (null = none).
    //   - generation: monotonically increasing token. Each callback captures
    //     its generation; if a newer callback fires before the previous one
    //     completes, the older one bails out so only the latest "wins".
    let lastUid: string | null = null;
    let generation = 0;
    let disposed = false;

    /** Strict transition: detach listeners → wipe store → optionally re-bootstrap. */
    function transitionOut() {
      // 1. Stop server emissions FIRST — otherwise the in-flight snapshot
      //    can land between reset() and the next bootstrap, re-introducing D4.
      unsubscribeAll();
      // 2. Clear the in-memory store + the persisted localStorage payload.
      resetFinance();
    }

    const unsubscribe = subscribeAuth(async (user) => {
      // Always reflect the auth state on the auth store first so any
      // RedirectIfAuthed / loading UI updates immediately.
      setUser(user);

      // ── LOGOUT ──────────────────────────────────────────────────────────
      if (!user) {
        // Idempotent: if there was no previous user, nothing to tear down.
        if (lastUid === null) return;
        lastUid = null;
        generation++;
        transitionOut();
        // Step 3 (bootstrap) intentionally skipped on logout.
        return;
      }

      // ── SAME-UID REFIRE ─────────────────────────────────────────────────
      // Token refresh, tab focus, StrictMode remount, etc. The store is
      // already sync'd; do nothing. `bootstrap` would also no-op via its
      // internal `currentSubscribedUid` guard, but exiting here saves the
      // profile round-trip too.
      if (lastUid === user.uid) return;

      // ── LOGIN or UID CHANGE ─────────────────────────────────────────────
      const isUidChange = lastUid !== null && lastUid !== user.uid;
      lastUid = user.uid;
      const myGeneration = ++generation;

      // Strict order: tear down the OLD session before touching the new one.
      // Login (lastUid was null) skips this — there's nothing to detach.
      if (isUidChange) {
        transitionOut();
      }

      try {
        const existing = await getUserProfile(user.uid).catch(() => null);

        // If a newer callback superseded us (rapid login/logout/login,
        // or this hook re-mounted under StrictMode), drop our work on the
        // floor. The newer callback owns the transition now.
        if (disposed || myGeneration !== generation) return;

        const profile: UserProfile = {
          id: user.uid,
          name: existing?.name ?? user.displayName ?? user.email?.split("@")[0] ?? "Arka user",
          email: user.email ?? existing?.email ?? "",
          monthlyIncome: existing?.monthlyIncome ?? 0,
          currency: existing?.currency ?? "USD",
          photoURL: user.photoURL ?? existing?.photoURL,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          theme: existing?.theme,
          language: existing?.language,
          onboardingCompleted: existing?.onboardingCompleted,
          tutorialVersion: existing?.tutorialVersion,
        };
        setProfile(profile);
        await persistProfile(profile);

        if (disposed || myGeneration !== generation) return;

        // Step 3: attach fresh listeners under the new identity. `bootstrap`
        // is itself idempotent; calling it again with the same uid (e.g.
        // because StrictMode double-mounted us) is a no-op inside the store.
        await bootstrap(user.uid);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Arka] auth listener failed:", err);
        }
      }
    });

    return () => {
      // Component teardown (route change, hot-reload, sign-out from a
      // different surface). Detach the auth subscription, then make sure
      // no Firestore listeners outlive this effect.
      disposed = true;
      generation++;
      unsubscribe();
      unsubscribeAll();
    };
  }, [setUser, setLoading, bootstrap, setProfile, resetFinance, unsubscribeAll]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
