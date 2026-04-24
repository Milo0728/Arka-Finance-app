import { differenceInCalendarMonths, parseISO, startOfMonth } from "date-fns";
import type { Expense, Subscription } from "@/types";
import { cycleToMonthly } from "./finance";

export type DetectedFrequency = "monthly" | "weekly" | "irregular";

export interface SubscriptionStats {
  /** Number of expense rows linked via `subscriptionId`. */
  linkedCount: number;
  /**
   * Best estimate for the monthly outflow in USD.
   * - When there are ≥ 2 linked expenses: total linked spend ÷ months elapsed
   *   (source = "linked"). Real activity wins over whatever the user declared.
   * - Otherwise: the `subscription.billingCycle` projection (source = "declared").
   */
  monthlyAverageUsd: number;
  /** Where `monthlyAverageUsd` came from — the UI uses this to prefix "~". */
  averageSource: "linked" | "declared";
  /** ISO date of the most recent linked expense. Null when nothing is linked. */
  lastPaidDate: string | null;
  /**
   * Account the subscription is most often paid from. Counts use `accountId`
   * literally — expenses without an `accountId` count as "general" and
   * surface as `null`. Null when nothing is linked, when there is no
   * majority bucket, or when there's a tie (see `accountTie`).
   */
  mostFrequentAccountId: string | null;
  /**
   * True when two or more buckets share the top spot. The UI reads this
   * before `mostFrequentAccountId` so it can show "Multiple accounts"
   * instead of picking an arbitrary winner.
   */
  accountTie: boolean;
  /**
   * Cadence inferred from the gaps between linked payments. Null when we
   * have fewer than 2 payments (can't infer a gap). We never write this
   * back onto the Subscription — it's purely a display signal so users can
   * compare their declared `billingCycle` against reality.
   */
  detectedFrequency: DetectedFrequency | null;
}

/**
 * Guess the cadence of a series of payment dates. Heuristic:
 *  - needs ≥ 2 payments (otherwise returns null — nothing to compare)
 *  - uses the median of consecutive-date gaps (robust to outliers)
 *  - buckets the median by day count; high variance around the median is
 *    treated as "irregular" even when the median lands inside a bucket.
 */
export function detectFrequency(dates: Date[]): DetectedFrequency | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(days);
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sortedGaps.length / 2);
  const median =
    sortedGaps.length % 2 === 0
      ? (sortedGaps[mid - 1] + sortedGaps[mid]) / 2
      : sortedGaps[mid];

  // With ≥ 3 gaps we can evaluate spread. If any gap diverges by more than
  // 40% of the median, call it irregular — consistent with how humans would
  // describe a subscription that hits at unpredictable times.
  if (gaps.length >= 3) {
    const maxDeviation = Math.max(...gaps.map((g) => Math.abs(g - median)));
    if (median > 0 && maxDeviation > median * 0.4) return "irregular";
  }

  if (median >= 5 && median <= 10) return "weekly";
  if (median >= 25 && median <= 35) return "monthly";
  // Outside the weekly / monthly bands we simply flag it as variable. Lets
  // the UI avoid misleading the user with a specific cadence label.
  return "irregular";
}

/**
 * Compute per-subscription stats from the global expense list. Pure function
 * so it can be safely memoised in the page. The "monthly average" reads
 * differently depending on data availability:
 *
 *  - With ≥ 1 linked expense: total linked spend ÷ months elapsed since the
 *    earliest linked one (clamped to ≥ 1). This catches sub-monthly billing
 *    cadences that diverge from the declared `billingCycle`.
 *  - With nothing linked: the declared `billingCycle` projection. Keeps the
 *    UI useful before the user has tagged a single expense.
 */
export function getSubscriptionStats(
  subscription: Subscription,
  expenses: Expense[]
): SubscriptionStats {
  const linked = expenses.filter((e) => e.subscriptionId === subscription.id);

  if (linked.length === 0) {
    return {
      linkedCount: 0,
      monthlyAverageUsd: cycleToMonthly(subscription.amount, subscription.billingCycle),
      averageSource: "declared",
      lastPaidDate: null,
      mostFrequentAccountId: null,
      accountTie: false,
      detectedFrequency: null,
    };
  }

  // Total spent and date range.
  const total = linked.reduce((acc, e) => acc + e.amount, 0);
  const sortedDates = linked
    .map((e) => parseISO(e.date))
    .sort((a, b) => a.getTime() - b.getTime());
  const earliest = sortedDates[0];
  const latest = sortedDates[sortedDates.length - 1];
  const monthsSpan = Math.max(
    1,
    differenceInCalendarMonths(startOfMonth(new Date()), startOfMonth(earliest)) + 1
  );

  // Account-frequency vote. We treat "no accountId" as a real bucket so the
  // UI can show "General" honestly when most payments are unassigned.
  const counts = new Map<string | null, number>();
  for (const e of linked) {
    const key = e.accountId ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let topAccount: string | null = null;
  let topCount = 0;
  let tiedAtTop = 0;
  for (const [accountId, count] of counts) {
    if (count > topCount) {
      topAccount = accountId;
      topCount = count;
      tiedAtTop = 1;
    } else if (count === topCount) {
      // Keep the earliest winner stable, but track that we have a tie so the
      // UI can show a neutral "Multiple accounts" label instead of picking
      // an arbitrary account name.
      tiedAtTop += 1;
    }
  }
  const accountTie = tiedAtTop > 1;

  // Trust the linked-expense average only when we have ≥ 2 data points. A
  // single payment tells us very little about a monthly rate, so we fall
  // back to the declared cycle in that case rather than extrapolating blindly.
  const useLinkedAverage = linked.length >= 2;
  const monthlyAverageUsd = useLinkedAverage
    ? total / monthsSpan
    : cycleToMonthly(subscription.amount, subscription.billingCycle);
  const averageSource: SubscriptionStats["averageSource"] = useLinkedAverage
    ? "linked"
    : "declared";

  const detectedFrequency = detectFrequency(sortedDates);

  return {
    linkedCount: linked.length,
    monthlyAverageUsd,
    averageSource,
    lastPaidDate: latest.toISOString().slice(0, 10),
    mostFrequentAccountId: accountTie ? null : topAccount,
    accountTie,
    detectedFrequency,
  };
}
