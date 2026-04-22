"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { persistProfile, useFinanceStore } from "@/store/useFinanceStore";
import { COOKIE_KEYS, getCookie, setCookie } from "@/lib/preferences";
import type { Currency, UserProfile } from "@/types";
import type { Locale } from "@/i18n/config";

type PreferencePatch = {
  currency?: Currency;
  theme?: "light" | "dark" | "system";
  language?: Locale;
  onboardingCompleted?: boolean;
  tutorialVersion?: number;
};

/**
 * Merge preference patch into the stored profile (local + Firestore) so user
 * choices survive reloads and follow them across devices when signed in.
 * Silent no-op when there is no profile yet (guest / pre-auth).
 */
export async function saveProfilePreferences(patch: PreferencePatch) {
  const state = useFinanceStore.getState();
  if (patch.currency && patch.currency !== state.currency) {
    state.setCurrency(patch.currency);
  }
  if (!state.profile) return;
  const next: UserProfile = { ...state.profile };
  if (patch.currency) next.currency = patch.currency;
  if (patch.theme) next.theme = patch.theme;
  if (patch.language) next.language = patch.language;
  if (typeof patch.onboardingCompleted === "boolean")
    next.onboardingCompleted = patch.onboardingCompleted;
  if (typeof patch.tutorialVersion === "number") next.tutorialVersion = patch.tutorialVersion;
  useFinanceStore.setState({ profile: next });
  try {
    await persistProfile(next);
  } catch {
    // Offline / Firestore down: local copy still wins on next load.
  }
}

/**
 * Applies theme/language/currency saved on the user's Firestore profile to the
 * live client state after sign-in, then keeps them in sync if the profile is
 * updated elsewhere (e.g. another tab).
 */
export function usePreferencesSync() {
  const profile = useFinanceStore((s) => s.profile);
  const currency = useFinanceStore((s) => s.currency);
  const setCurrency = useFinanceStore((s) => s.setCurrency);
  const { theme, setTheme } = useTheme();
  const activeLocale = useLocale() as Locale;
  const router = useRouter();

  const profileTheme = profile?.theme;
  const profileLanguage = profile?.language;
  const profileCurrency = profile?.currency;

  React.useEffect(() => {
    if (profileCurrency && profileCurrency !== currency) {
      setCurrency(profileCurrency);
    }
  }, [profileCurrency, currency, setCurrency]);

  React.useEffect(() => {
    if (profileTheme && profileTheme !== theme) {
      setTheme(profileTheme);
    }
  }, [profileTheme, theme, setTheme]);

  React.useEffect(() => {
    if (!profileLanguage) return;
    if (profileLanguage === activeLocale) return;
    if (getCookie(COOKIE_KEYS.language) === profileLanguage) return;
    setCookie(COOKIE_KEYS.language, profileLanguage);
    router.refresh();
  }, [profileLanguage, activeLocale, router]);
}
