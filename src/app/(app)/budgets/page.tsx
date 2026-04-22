"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { BudgetForm } from "@/features/budget/budget-form";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { budgetUsage } from "@/utils/finance";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types";

export default function BudgetsPage() {
  const budgets = useFinanceStore((s) => s.budgets);
  const expenses = useFinanceStore((s) => s.expenses);
  const removeBudget = useFinanceStore((s) => s.removeBudget);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("budgets");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Budget | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditing(budget);
    setOpen(true);
  }

  async function onDelete(budget: Budget) {
    await removeBudget(budget.id);
    toast.success(t("toasts.removed"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("newBudget")}</span>
          </Button>
        }
      />

      {budgets.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("newBudget")}</span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const { used, limit, pct } = budgetUsage(expenses, b);
            const overshoot = used > limit;
            const approaching = pct >= 80 && pct < 100;
            const color = overshoot ? "bg-destructive" : approaching ? "bg-warning" : "bg-primary";
            const pctRounded = Math.round(pct);

            return (
              <Card key={b.id} className="group">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">
                      {labels.expenseCategory(b.category) ?? b.category}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="muted" className="text-[10px] uppercase">
                        {labels.billing(b.period)}
                      </Badge>
                      {overshoot && (
                        <Badge variant="destructive" className="text-[10px]">{t("over")}</Badge>
                      )}
                      {approaching && (
                        <Badge variant="warning" className="text-[10px]">{t("warning")}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)} aria-label={tCommon("edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(b)}
                      aria-label={tCommon("delete")}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="arka-number text-2xl font-semibold">{money.format(used)}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("of", { limit: money.format(limit) })}
                    </span>
                  </div>
                  <Progress value={Math.min(100, pct)} indicatorClassName={color} />
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      overshoot ? "text-destructive" : approaching ? "text-warning" : "text-success"
                    )}
                  >
                    {overshoot ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : approaching ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {overshoot
                      ? t("overBy", { amount: money.format(used - limit) })
                      : approaching
                      ? t("usedSlow", { pct: pctRounded })
                      : t("usedTrack", { pct: pctRounded })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
