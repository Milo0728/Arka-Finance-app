/**
 * Feature flag layer. Right now everything is unlocked because Arka is in beta —
 * the structure exists so a future paywall (or per-account entitlements) can flip
 * individual features without rewriting call sites.
 *
 * Usage:
 *   import { useFeatureFlag } from "@/lib/feature-flags";
 *   const canUseMultiAccount = useFeatureFlag("multiAccount");
 */

export type FeatureKey =
  | "multiAccount"
  | "advancedInsights"
  | "quickAddPro"
  | "csvImport"
  | "achievements";

export interface FeatureFlags {
  /** Master gate. While true, every premium-flagged feature is unlocked. */
  isPremiumEnabled: boolean;
  features: Record<FeatureKey, boolean>;
}

const DEFAULT_FLAGS: FeatureFlags = {
  isPremiumEnabled: true,
  features: {
    multiAccount: true,
    advancedInsights: true,
    quickAddPro: true,
    csvImport: true,
    achievements: true,
  },
};

let CURRENT_FLAGS: FeatureFlags = DEFAULT_FLAGS;

export function getFeatureFlags(): FeatureFlags {
  return CURRENT_FLAGS;
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  const flags = CURRENT_FLAGS;
  if (!flags.isPremiumEnabled) return false;
  return flags.features[key] === true;
}

/**
 * Override flags at runtime — convenient for tests, the future paywall hook, or
 * a debug panel. Pass a partial; missing keys fall back to defaults.
 */
export function setFeatureFlags(next: Partial<FeatureFlags>): void {
  CURRENT_FLAGS = {
    isPremiumEnabled: next.isPremiumEnabled ?? CURRENT_FLAGS.isPremiumEnabled,
    features: { ...CURRENT_FLAGS.features, ...(next.features ?? {}) },
  };
}

/**
 * React hook wrapper. Kept as a plain function (no useSyncExternalStore) because
 * flags are static at runtime today; if they become reactive, swap the body
 * without touching call sites.
 */
export function useFeatureFlag(key: FeatureKey): boolean {
  return isFeatureEnabled(key);
}
