"use client";

import * as React from "react";
import { Pencil, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubscriptionForm } from "@/features/subscription/subscription-form";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import {
  detectPotentialSubscriptions,
  monthlyEquivalent,
} from "@/utils/finance";
import { filterByAccount } from "@/utils/accounts";
import { getSubscriptionStats } from "@/utils/subscription-stats";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LinkExpensesDialog } from "@/features/subscription/link-expenses-dialog";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Subscription } from "@/types";

export default function SubscriptionsPage() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const expensesAll = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const removeSubscription = useFinanceStore((s) => s.removeSubscription);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const profile = useFinanceStore((s) => s.profile);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("subscriptions");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [linking, setLinking] = React.useState<Subscription | null>(null);

  // Lookup table for the "paid from" column. Keeps the per-row JSX simple
  // and makes the empty state ("General") explicit.
  const accountNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) map.set(a.id, a.name);
    return map;
  }, [accounts]);

  // Per-subscription derived stats — recomputed only when expenses or the
  // subscription list change, NOT on every render.
  const subStats = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof getSubscriptionStats>>();
    for (const s of subscriptions) {
      map.set(s.id, getSubscriptionStats(s, expensesAll));
    }
    return map;
  }, [subscriptions, expensesAll]);

  // Monthly total respects the same "expenses as source of truth" rule as
  // the per-row column: use the linked-average when available, fall back to
  // the declared cycle otherwise. Keeps the KPI, the table rows and the
  // tooltips consistent.
  const monthlyTotal = React.useMemo(
    () =>
      subscriptions.reduce((sum, s) => {
        const stats = subStats.get(s.id);
        return sum + (stats?.monthlyAverageUsd ?? monthlyEquivalent(s));
      }, 0),
    [subscriptions, subStats]
  );
  const yearlyTotal = monthlyTotal * 12;
  // "Paid from" adds information as soon as there's more than one possible
  // bucket. With 0 real accounts everything is General (the column would
  // say the same thing every row); with 1+ real accounts payments can split
  // between General and that account, so the column becomes useful.
  const showPaidFromColumn = accounts.length >= 1;

  // Subscriptions themselves are global — no UI filter here by design. But
  // the candidate detector runs on expenses, which DO carry accountId. Honour
  // the store's active account so suggestions come from the same scope the
  // user is currently focused on. Silent on purpose.
  const candidates = React.useMemo(() => {
    const scopedExpenses = filterByAccount(expensesAll, activeAccountId);
    return detectPotentialSubscriptions(scopedExpenses).filter(
      (c) => !subscriptions.some((s) => s.name.toLowerCase() === (c.description ?? "").toLowerCase())
    );
  }, [expensesAll, activeAccountId, subscriptions]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setOpen(true);
  }

  async function onDelete(sub: Subscription) {
    await removeSubscription(sub.id);
    toast.success(t("toasts.removed"));
  }

  async function addFromCandidate(description: string, amount: number) {
    await addSubscription({
      userId: profile?.id ?? "demo-user",
      name: description,
      amount,
      billingCycle: "monthly",
      category: "subscriptions",
    });
    toast.success(t("toasts.added"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" onClick={openNew} data-tutorial="add-button">
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("newSubscription")}</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label={t("active")}
          value={String(subscriptions.length)}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KPICard label={t("monthlyTotal")} value={money.format(monthlyTotal)} tone="warning" />
        <KPICard label={t("yearlyTotal")} value={money.format(yearlyTotal)} />
      </div>

      {candidates.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("candidatesTitle")}
            </CardTitle>
            <CardDescription>{t("candidatesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {candidates.slice(0, 8).map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                className="rounded-full border-dashed"
                onClick={() => addFromCandidate(c.description ?? t("recurringFallback"), c.amount)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ml-1">
                  {c.description} · {money.format(c.amount)}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("newSubscription")}</span>
            </Button>
          }
        />
      ) : (
        <Card data-tutorial="main">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.service")}</TableHead>
                  <TableHead>{t("table.billing")}</TableHead>
                  <TableHead className="text-right">{t("table.amount")}</TableHead>
                  <TableHead className="text-right">{t("table.monthly")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("table.lastPaid")}</TableHead>
                  {showPaidFromColumn && (
                    <TableHead className="hidden lg:table-cell">{t("table.paidFrom")}</TableHead>
                  )}
                  <TableHead className="w-24 text-right">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => {
                  const stats = subStats.get(s.id);
                  const linkedAny = (stats?.linkedCount ?? 0) > 0;
                  // "Paid from" chooses between four states in this order:
                  //   1. nothing linked        → "Not associated"
                  //   2. multiple accounts tied → "Multiple accounts" (neutral)
                  //   3. winner with accountId → that account's name
                  //   4. winner with null      → "General" (no account assigned)
                  const paidFromLabel = !linkedAny
                    ? t("table.notLinked")
                    : stats?.accountTie
                    ? t("table.multipleAccounts")
                    : stats?.mostFrequentAccountId
                    ? accountNameById.get(stats.mostFrequentAccountId) ?? t("table.unknownAccount")
                    : t("table.unassignedAccount");
                  const paidFromTooltip = stats?.accountTie
                    ? t("link.multipleAccountsHint")
                    : t("link.linkHint");
                  const lastPaid = stats?.lastPaidDate
                    ? format(parseISO(stats.lastPaidDate), "MMM d, yyyy")
                    : t("table.notLinked");
                  // Monthly column: dynamic when we have real data, declared
                  // otherwise. The "~" prefix tells the user the number is an
                  // estimate derived from their actual payments.
                  const isEstimated = stats?.averageSource === "linked";
                  const monthlyDisplay = stats
                    ? `${isEstimated ? "~" : ""}${money.format(stats.monthlyAverageUsd)}`
                    : money.format(monthlyEquivalent(s));
                  // Detected frequency is only surfaced when it differs from
                  // the declared billing cycle — otherwise it would be noise.
                  const detectedFreqLabel = stats?.detectedFrequency
                    ? t(`table.frequency.${stats.detectedFrequency}`)
                    : null;
                  const showDetectedMismatch =
                    stats?.detectedFrequency &&
                    stats.detectedFrequency !== s.billingCycle;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="muted" className="w-fit">
                            {labels.billing(s.billingCycle)}
                          </Badge>
                          {showDetectedMismatch && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-[10px] text-warning">
                                  ≈ {detectedFreqLabel}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("table.detectedHint")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="arka-number text-right">{money.format(s.amount)}</TableCell>
                      <TableCell
                        className={cn(
                          "arka-number text-right",
                          isEstimated ? "text-foreground font-medium" : "text-muted-foreground"
                        )}
                      >
                        {isEstimated ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{monthlyDisplay}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("table.estimatedHint", {
                                count: stats?.linkedCount ?? 0,
                              })}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          monthlyDisplay
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {lastPaid}
                      </TableCell>
                      {showPaidFromColumn && (
                        <TableCell className="hidden lg:table-cell text-xs">
                          {linkedAny ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={stats?.accountTie ? "warning" : "muted"}
                                  className="cursor-help"
                                >
                                  {paidFromLabel}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{paidFromTooltip}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => setLinking(s)}
                            >
                              <Link2 className="h-3 w-3" />
                              <span className="ml-1">{t("link.noDataAction")}</span>
                            </Button>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setLinking(s)}
                            aria-label={t("link.linkExisting")}
                            title={t("link.linkExisting")}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label={tCommon("edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(s)}
                            aria-label={tCommon("delete")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SubscriptionForm open={open} onOpenChange={setOpen} editing={editing} />
      {linking && (
        <LinkExpensesDialog
          subscription={linking}
          open={!!linking}
          onOpenChange={(v) => {
            if (!v) setLinking(null);
          }}
        />
      )}
    </div>
  );
}
