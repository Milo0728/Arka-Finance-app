"use client";

import { useEffect } from "react";
import { subscribeAuth } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { persistProfile, useFinanceStore } from "@/store/useFinanceStore";
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
      if (user) {
        const profile: UserProfile = {
          id: user.uid,
          name: user.displayName ?? user.email?.split("@")[0] ?? "Arka user",
          email: user.email ?? "",
          monthlyIncome: 0,
          currency: "USD",
          photoURL: user.photoURL ?? undefined,
          createdAt: new Date().toISOString(),
        };
        setProfile(profile);
        await persistProfile(profile);
        await bootstrap(user.uid);
      }
    });
    return () => unsubscribe();
  }, [setUser, setLoading, bootstrap, setProfile]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
