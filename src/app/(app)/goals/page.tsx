"use client";

import * as React from "react";
import { CalendarClock, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { GoalForm } from "@/features/goal/goal-form";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { monthlySavingNeeded, monthsUntil } from "@/utils/finance";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const goals = useFinanceStore((s) => s.goals);
  const removeGoal = useFinanceStore((s) => s.removeGoal);
  const money = useMoney();
  const t = useTranslations("goals");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setOpen(true);
  }

  async function onDelete(goal: Goal) {
    await removeGoal(goal.id);
    toast.success(t("toasts.removed"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" onClick={openNew} data-tutorial="add-button">
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("newGoal")}</span>
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("createFirst")}</span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-tutorial="main">
          {goals.map((g) => {
            const progress = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const monthsLeft = monthsUntil(g.deadline);
            const perMonth = monthlySavingNeeded(g);
            const achieved = progress >= 100;
            const deadlineFmt = format(parseISO(g.deadline), "MMM d, yyyy");
            return (
              <Card key={g.id} className="group overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">{g.title}</CardTitle>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>{t("by", { date: deadlineFmt })}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(g)} aria-label={tCommon("edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(g)}
                      aria-label={tCommon("delete")}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="arka-number text-2xl font-semibold">
                        {money.format(g.currentAmount)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("of", { target: money.format(g.targetAmount) })}
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      indicatorClassName={achieved ? "bg-success" : "bg-gradient-to-r from-brand-600 to-brand-400"}
                    />
                    <div className="text-xs text-muted-foreground">
                      {t("complete", { pct: progress.toFixed(1) })}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                    {achieved ? (
                      <Badge variant="success">{t("achieved")}</Badge>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("monthsRemaining")}</span>
                          <span className="arka-number font-medium text-foreground">{monthsLeft}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("saveMonthly")}</span>
                          <span className="arka-number font-medium text-foreground">
                            {money.format(perMonth)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
