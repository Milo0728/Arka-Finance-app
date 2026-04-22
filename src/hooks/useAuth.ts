"use client";

import { useEffect } from "react";
import { subscribeAuth } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { persistProfile, useFinanceStore } from "@/store/useFinanceStore";
import { getUserProfile } from "@/services/firestore.service";
import type { UserProfile } from "@/types";

export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const bootstrap = useFinanceStore((s) => s.bootstrap);
  const setProfile = useFinanceStore((s) => s.setProfile);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeAuth(async (user) => {
      setUser(user);
      if (!user) return;
      try {
        const existing = await getUserProfile(user.uid).catch(() => null);
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
        };
        setProfile(profile);
        await persistProfile(profile);
        await bootstrap(user.uid);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Arka] auth listener failed:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [setUser, setLoading, bootstrap, setProfile]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
