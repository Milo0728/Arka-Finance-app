"use client";

import * as React from "react";
import { Trophy, Lock, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  consecutiveVisitStreak,
  useAchievementsStore,
  type AchievementId,
} from "@/store/useAchievementsStore";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { monthlyExpenses, monthlyIncome, savingsRate } from "@/utils/finance";

/**
 * Self-contained achievement engine. Watches the finance store via selectors
 * and idempotently unlocks badges as conditions become true. Kept as a single
 * component so it can be dropped into the dashboard without touching the store.
 */
export function AchievementsPanel() {
  const enabled = isFeatureEnabled("achievements");
  const incomes = useFinanceStore((s) => s.incomes);
  const expenses = useFinanceStore((s) => s.expenses);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useFinanceStore((s) => s.goals);

  const unlocked = useAchievementsStore((s) => s.unlocked);
  const unlock = useAchievementsStore((s) => s.unlock);
  const recordVisit = useAchievementsStore((s) => s.recordVisit);
  const visitDays = useAchievementsStore((s) => s.visitDays);

  const t = useTranslations("achievements");

  // ── Detection rules ──────────────────────────────────────────────────────
  React.useEffect(() => {
    recordVisit();
  }, [recordVisit]);

  React.useEffect(() => {
    if (incomes.length > 0) unlock("first-income");
  }, [incomes.length, unlock]);

  React.useEffect(() => {
    if (expenses.length > 0) unlock("first-expense");
  }, [expenses.length, unlock]);

  React.useEffect(() => {
    if (budgets.length > 0) unlock("first-budget");
  }, [budgets.length, unlock]);

  React.useEffect(() => {
    if (goals.length > 0) unlock("first-goal");
  }, [goals.length, unlock]);

  React.useEffect(() => {
    const rate = savingsRate(monthlyIncome(incomes), monthlyExpenses(expenses));
    if (rate >= 10) unlock("babylon-saver");
  }, [incomes, expenses, unlock]);

  React.useEffect(() => {
    if (consecutiveVisitStreak(visitDays) >= 7) unlock("streak-7");
  }, [visitDays, unlock]);

  if (!enabled) return null;

  const order: AchievementId[] = [
    "first-expense",
    "first-income",
    "first-budget",
    "first-goal",
    "babylon-saver",
    "streak-7",
  ];

  const unlockedCount = order.filter((id) => !!unlocked[id]).length;

  // Collapsed by default — the panel is decorative and belongs to the
  // "bonus / motivation" layer, not the main financial picture. A native
  // <details> keeps the implementation trivial and fully keyboard-accessible
  // (Space toggles, Tab moves focus as usual).
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 hover:bg-muted/40">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="text-xs text-muted-foreground">
                {t("subtitle", { unlocked: unlockedCount, total: order.length })}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
      <CardContent className="pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          {order.map((id) => {
            const earned = !!unlocked[id];
            return (
              <div
                key={id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  earned ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
                    earned ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {earned ? <Trophy className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t(`items.${id}.title`)}</p>
                    {earned && (
                      <Badge variant="success" className="text-[10px]">
                        {t("earned")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`items.${id}.desc`)}</p>
                </div>
              </div>
            );
          })}
        </div>
        {unlockedCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">{t("encouragement")}</p>
        )}
      </CardContent>
      </details>
    </Card>
  );
}
