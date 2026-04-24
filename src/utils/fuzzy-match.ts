import type { Subscription } from "@/types";

/**
 * Lowercase + strip diacritics + collapse whitespace. Cheap enough to run on
 * every keystroke of Quick Add. Returns an empty string when the input has no
 * alphanumeric content.
 */
export function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classic Levenshtein distance. Iterative with a single row of state — O(n·m)
 * time but O(min(n,m)) memory. Plenty fast for subscription names (typically
 * < 20 chars) against a list under ~200 items.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Swap to keep the inner loop short.
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }
  const prev = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    let prevDiag = prev[0];
    prev[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = prev[i];
      prev[i] =
        a[i - 1] === b[j - 1]
          ? prevDiag
          : 1 + Math.min(prev[i - 1], prev[i], prevDiag);
      prevDiag = temp;
    }
  }
  return prev[a.length];
}

export type MatchStrength = "strong" | "medium" | "none";

export interface FuzzyMatchResult {
  /** Best-scoring subscription when `strength !== "none"`. */
  match: Subscription | null;
  /** 0–1 normalised confidence. 1 means exact. */
  score: number;
  strength: MatchStrength;
}

/**
 * Try to match a free-form description against the user's existing
 * subscriptions. Combines two signals:
 *
 *  1. substring containment (handles shorthand like "netf" → "netflix"),
 *  2. Levenshtein similarity (handles typos like "netflx" → "netflix").
 *
 * Scoring is calibrated for the sizes of real-world subscription names:
 *  - ≥ 0.85 → "strong"   (auto-assign safely)
 *  - ≥ 0.6  → "medium"   (suggest to user, require confirmation)
 *  - else   → "none"     (don't assign)
 *
 * Returns the highest-scoring candidate or null when nothing clears the
 * "medium" bar. Ties keep the first winner to avoid thrash.
 */
export function fuzzyMatchSubscription(
  query: string,
  subscriptions: Subscription[]
): FuzzyMatchResult {
  const normalisedQuery = normalise(query);
  if (!normalisedQuery || subscriptions.length === 0) {
    return { match: null, score: 0, strength: "none" };
  }

  let best: { sub: Subscription; score: number } | null = null;
  for (const sub of subscriptions) {
    const normalisedName = normalise(sub.name);
    if (!normalisedName) continue;

    // Exact wins immediately — no point scoring others.
    if (normalisedName === normalisedQuery) {
      return { match: sub, score: 1, strength: "strong" };
    }

    let score = 0;

    // Substring score: full containment either way scores high, but short
    // queries like "n" must NOT match "netflix" — require ≥ 3 meaningful chars.
    if (normalisedQuery.length >= 3 && normalisedName.includes(normalisedQuery)) {
      const lenRatio = normalisedQuery.length / normalisedName.length;
      // 0.7 baseline, bonus up to 0.25 as query converges on full length.
      score = Math.max(score, 0.7 + lenRatio * 0.25);
    } else if (
      normalisedName.length >= 3 &&
      normalisedQuery.includes(normalisedName)
    ) {
      // Query contains the whole subscription name — user probably typed a
      // longer phrase ("netflix premium"). Strong signal too.
      score = Math.max(score, 0.85);
    }

    // Edit-distance score: 1 − normalised distance. We bound the raw distance
    // by the longer of the two lengths so "abc" vs "xyz" → score 0.
    const dist = levenshtein(normalisedQuery, normalisedName);
    const maxLen = Math.max(normalisedQuery.length, normalisedName.length);
    if (maxLen > 0) {
      score = Math.max(score, 1 - dist / maxLen);
    }

    if (!best || score > best.score) best = { sub, score };
  }

  if (!best || best.score < 0.6) return { match: null, score: 0, strength: "none" };
  const strength: MatchStrength = best.score >= 0.85 ? "strong" : "medium";
  return { match: best.sub, score: best.score, strength };
}
