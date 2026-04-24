"use client";

import * as React from "react";
import { Landmark, Plus, Wallet, Banknote, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountForm } from "@/features/account/account-form";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useFeatureFlag } from "@/lib/feature-flags";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { computeAccountBalances, consolidatedBalance, DEFAULT_BUCKET_ID } from "@/utils/accounts";
import type { Account, AccountType } from "@/types";

const ICONS: Record<AccountType, React.ReactNode> = {
  bank: <Landmark className="h-4 w-4" />,
  cash: <Banknote className="h-4 w-4" />,
  wallet: <Wallet className="h-4 w-4" />,
};

export default function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const incomes = useFinanceStore((s) => s.incomes);
  const expenses = useFinanceStore((s) => s.expenses);
  const removeAccount = useFinanceStore((s) => s.removeAccount);
  const money = useMoney();
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const enabled = useFeatureFlag("multiAccount");
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Account | null>(null);

  const balances = React.useMemo(
    () => computeAccountBalances(incomes, expenses, accounts),
    [incomes, expenses, accounts]
  );
  const total = React.useMemo(
    () => consolidatedBalance(incomes, expenses, accounts),
    [incomes, expenses, accounts]
  );

  // Build a "default bucket" entry only when there are unassigned entries —
  // keeps the list clean for users who organise everything by account.
  const defaultBalance = balances.get(DEFAULT_BUCKET_ID);
  const hasDefaultActivity =
    !!defaultBalance && (defaultBalance.incomeUsd > 0 || defaultBalance.expenseUsd > 0);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setOpen(true);
  }

  async function handleRemove(a: Account) {
    const ok = await confirm({
      title: t("confirmRemoveTitle", { name: a.name }),
      description: t("confirmRemove", { name: a.name }),
      confirmLabel: tCommon("delete"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    await removeAccount(a.id);
    toast.success(t("toasts.removed"));
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title={t("title")} description={t("description")} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("notAvailable")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("newAccount")}</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{t("consolidated")}</CardTitle>
          <CardDescription
            className="arka-number truncate text-2xl font-semibold text-foreground sm:text-3xl"
            title={money.format(total)}
          >
            {money.format(total)}
          </CardDescription>
        </CardHeader>
      </Card>

      {accounts.length === 0 && !hasDefaultActivity ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("newAccount")}</span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hasDefaultActivity && defaultBalance && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{t("defaultBucket")}</CardTitle>
                  </div>
                  <Badge variant="muted" className="text-[10px] uppercase">
                    {t("defaultBadge")}
                  </Badge>
                </div>
                <CardDescription>{t("defaultDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p
                  className="arka-number truncate text-xl font-semibold sm:text-2xl"
                  title={money.format(defaultBalance.netUsd)}
                >
                  {money.format(defaultBalance.netUsd)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="min-w-0">
                    <p>{t("inflow")}</p>
                    <p
                      className="arka-number truncate text-sm font-medium text-foreground"
                      title={money.format(defaultBalance.incomeUsd)}
                    >
                      {money.format(defaultBalance.incomeUsd)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p>{t("outflow")}</p>
                    <p
                      className="arka-number truncate text-sm font-medium text-foreground"
                      title={money.format(defaultBalance.expenseUsd)}
                    >
                      {money.format(defaultBalance.expenseUsd)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {accounts.map((a) => {
            const b = balances.get(a.id);
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="shrink-0"
                        style={a.color ? { color: a.color } : undefined}
                      >
                        {ICONS[a.type]}
                      </span>
                      <CardTitle className="truncate text-base">{a.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {t(`types.${a.type}`)}
                    </Badge>
                  </div>
                  <CardDescription>{a.currency}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p
                    className="arka-number truncate text-xl font-semibold sm:text-2xl"
                    title={money.format(b?.netUsd ?? a.initialBalance)}
                  >
                    {money.format(b?.netUsd ?? a.initialBalance)}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="min-w-0">
                      <p>{t("inflow")}</p>
                      <p
                        className="arka-number truncate text-sm font-medium text-foreground"
                        title={money.format(b?.incomeUsd ?? 0)}
                      >
                        {money.format(b?.incomeUsd ?? 0)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p>{t("outflow")}</p>
                      <p
                        className="arka-number truncate text-sm font-medium text-foreground"
                        title={money.format(b?.expenseUsd ?? 0)}
                      >
                        {money.format(b?.expenseUsd ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="ml-1">{tCommon("edit")}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="ml-1">{tCommon("delete")}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountForm open={open} onOpenChange={setOpen} editing={editing} />
      {confirmDialog}
    </div>
  );
}
