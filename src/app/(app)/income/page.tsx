"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { differenceInCalendarMonths, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { IncomeForm } from "@/features/income/income-form";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { lifetimeIncome, monthlyIncome as getMonthlyIncome } from "@/utils/finance";
import { DEFAULT_BUCKET_ID, filterByAccount } from "@/utils/accounts";
import type { Income } from "@/types";

export default function IncomePage() {
  const incomesAll = useFinanceStore((s) => s.incomes);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const removeIncome = useFinanceStore((s) => s.removeIncome);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const tAccounts = useTranslations("accounts");

  // Name of the active account — used by the contextual empty state so the
  // message reads "No income for Itaú" instead of the generic one.
  const accountLabel = React.useMemo(() => {
    if (!activeAccountId) return null;
    if (activeAccountId === DEFAULT_BUCKET_ID) return tAccounts("filterUnassigned");
    return accounts.find((a) => a.id === activeAccountId)?.name ?? null;
  }, [activeAccountId, accounts, tAccounts]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Income | null>(null);

  const incomes = React.useMemo(
    () => filterByAccount(incomesAll, activeAccountId),
    [incomesAll, activeAccountId]
  );

  const total = lifetimeIncome(incomes);
  const thisMonth = getMonthlyIncome(incomes);
  const avg = React.useMemo(() => {
    if (!incomes.length) return 0;
    const oldest = incomes.reduce((min, i) => (i.date < min ? i.date : min), incomes[0].date);
    const months = Math.max(1, differenceInCalendarMonths(new Date(), parseISO(oldest)) + 1);
    return total / months;
  }, [incomes, total]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(income: Income) {
    setEditing(income);
    setOpen(true);
  }

  async function onDelete(income: Income) {
    await removeIncome(income.id);
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
            <Button onClick={openNew} size="sm" data-tutorial="add-button">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("logIncome")}</span>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label={t("allTime")}
          value={money.format(total)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="success"
        />
        <KPICard label={t("thisMonth")} value={money.format(thisMonth)} />
        <KPICard label={t("averageMonth")} value={money.format(avg)} />
      </div>

      {incomes.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-5 w-5" />}
          // Distinguish "nothing yet" from "nothing for THIS account". The
          // second case needs a different action hint since creating a new
          // income will (by default) still land outside the filtered account.
          title={
            accountLabel && incomesAll.length > 0
              ? t("emptyAccountTitle", { name: accountLabel })
              : t("emptyTitle")
          }
          description={
            accountLabel && incomesAll.length > 0 ? t("emptyAccountDesc") : t("emptyDesc")
          }
          action={
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("logIncome")}</span>
            </Button>
          }
        />
      ) : (
        <Card data-tutorial="main">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.description")}</TableHead>
                  <TableHead className="text-right">{t("table.amount")}</TableHead>
                  <TableHead className="w-24 text-right">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((i) => {
                  const freq = i.frequency ?? "once";
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{format(parseISO(i.date), "MMM d, yyyy")}</span>
                          {freq !== "once" && (
                            <Badge variant="muted" className="text-[10px] uppercase">
                              {labels.incomeFrequency(freq)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{labels.incomeCategory(i.category) ?? i.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm" title={i.description ?? undefined}>
                        {i.description ?? "—"}
                      </TableCell>
                      <TableCell className="arka-number text-right font-medium text-success">
                        +{money.format(i.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(i)} aria-label={tCommon("edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(i)}
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

      <IncomeForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
