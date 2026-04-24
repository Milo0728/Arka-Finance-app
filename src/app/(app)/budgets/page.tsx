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
import { AccountFilter } from "@/components/dashboard/account-filter";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { budgetUsage } from "@/utils/finance";
import { DEFAULT_BUCKET_ID, filterByAccount } from "@/utils/accounts";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types";

export default function BudgetsPage() {
  const budgets = useFinanceStore((s) => s.budgets);
  const expensesAll = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const removeBudget = useFinanceStore((s) => s.removeBudget);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("budgets");
  const tCommon = useTranslations("common");
  const tAccounts = useTranslations("accounts");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Budget | null>(null);

  // Budgets are global entities (no accountId in the schema). Filtering
  // `expenses` narrows only the *consumption* view — the limit stays the same
  // for every account. The UI below spells this out so a low bar isn't
  // misread as "budget surplus".
  const expenses = React.useMemo(
    () => filterByAccount(expensesAll, activeAccountId),
    [expensesAll, activeAccountId]
  );

  const accountLabel = React.useMemo(() => {
    if (!activeAccountId) return null;
    if (activeAccountId === DEFAULT_BUCKET_ID) return tAccounts("filterUnassigned");
    return accounts.find((a) => a.id === activeAccountId)?.name ?? null;
  }, [activeAccountId, accounts, tAccounts]);

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
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AccountFilter />
            <Button size="sm" onClick={openNew} data-tutorial="add-button">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("newBudget")}</span>
            </Button>
          </div>
        }
      />

      {/* Scope disclaimer — critical when filtering. Budgets themselves are
          not per-account, so the user must understand they're looking at
          consumption-from-one-account against a global limit. */}
      {accountLabel && budgets.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p>{t("scopeNote", { name: accountLabel })}</p>
        </div>
      )}

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-tutorial="main">
          {budgets.map((b) => {
            const { used, limit, pct } = budgetUsage(expenses, b);
            const overshoot = used > limit;
            const approaching = pct >= 80 && pct < 100;
            const color = overshoot ? "bg-destructive" : approaching ? "bg-warning" : "bg-primary";
            const pctRounded = Math.round(pct);

            return (
              <Card key={b.id} className="group">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                  {/* min-w-0 so a long category label truncates or wraps
                      instead of shoving the icon buttons outside the card. */}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {labels.expenseCategory(b.category) ?? b.category}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
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
                  {/* Action buttons: always visible on mobile (no hover), hidden
                      by default on sm+ so they stay clean until hovered. */}
                  <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
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
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <span
                      className="arka-number truncate text-xl font-semibold sm:text-2xl"
                      title={money.format(used)}
                    >
                      {money.format(used)}
                    </span>
                    <span
                      className="truncate text-sm text-muted-foreground"
                      title={t("of", { limit: money.format(limit) })}
                    >
                      {t("of", { limit: money.format(limit) })}
                    </span>
                  </div>
                  {accountLabel && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("consumedFrom", {
                        name: accountLabel,
                        used: money.format(used),
                        limit: money.format(limit),
                      })}
                    </p>
                  )}
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
