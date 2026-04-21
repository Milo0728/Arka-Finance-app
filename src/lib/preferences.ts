"use client";

import Cookies from "js-cookie";

/**
 * Centralised cookie keys for user preferences. Every cookie written by the
 * client should go through this module so there is only one spelling.
 */
export const COOKIE_KEYS = {
  theme: "user_theme",
  language: "user_language",
  consent: "cookie_consent",
  onboarding: "onboarding_completed",
} as const;

const ONE_YEAR = 365;

const DEFAULT_OPTIONS: Cookies.CookieAttributes = {
  sameSite: "lax",
  path: "/",
  expires: ONE_YEAR,
};

export function setCookie(key: string, value: string, options?: Cookies.CookieAttributes) {
  Cookies.set(key, value, { ...DEFAULT_OPTIONS, ...options });
}

export function getCookie(key: string): string | undefined {
  return Cookies.get(key);
}

export function removeCookie(key: string) {
  Cookies.remove(key, { path: "/" });
}

export function hasConsent() {
  return getCookie(COOKIE_KEYS.consent) === "accepted";
}
