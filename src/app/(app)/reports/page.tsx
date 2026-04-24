"use client";

import * as React from "react";
import { Download, FileBarChart2, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { subMonths } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CashflowChart, SavingsTrendChart } from "@/components/dashboard/lazy-charts";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { monthlyExpenses, monthlyIncome, savingsRate } from "@/utils/finance";
import { toCSV, downloadCSV } from "@/utils/export";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { DEFAULT_BUCKET_ID, filterByAccount } from "@/utils/accounts";

export default function ReportsPage() {
  const incomesAll = useFinanceStore((s) => s.incomes);
  const expensesAll = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("reports");
  const tAccounts = useTranslations("accounts");
  const tNav = useTranslations("nav");
  const now = React.useMemo(() => new Date(), []);

  // Apply the active account filter ONCE at the top — every KPI, chart, table
  // and export below reads from these narrowed arrays. No duplicated logic and
  // every derivation lives inside useMemo.
  const incomes = React.useMemo(
    () => filterByAccount(incomesAll, activeAccountId),
    [incomesAll, activeAccountId]
  );
  const expenses = React.useMemo(
    () => filterByAccount(expensesAll, activeAccountId),
    [expensesAll, activeAccountId]
  );

  // Pretty label for the export filename and the contextual hint.
  const accountLabel = React.useMemo(() => {
    if (!activeAccountId) return null;
    if (activeAccountId === DEFAULT_BUCKET_ID) return tAccounts("filterUnassigned");
    return accounts.find((a) => a.id === activeAccountId)?.name ?? null;
  }, [activeAccountId, accounts, tAccounts]);

  const last6 = React.useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const ref = subMonths(now, 5 - i);
        const income = monthlyIncome(incomes, ref);
        const expense = monthlyExpenses(expenses, ref);
        const rate = savingsRate(income, expense);
        return {
          ref,
          month: `${labels.monthShort(ref.getMonth())} ${ref.getFullYear()}`,
          income,
          expense,
          savings: Math.max(0, income - expense),
          rate,
        };
      }),
    [incomes, expenses, now, labels]
  );

  const totalIncome = last6.reduce((a, b) => a + b.income, 0);
  const totalExpense = last6.reduce((a, b) => a + b.expense, 0);
  const totalSavings = last6.reduce((a, b) => a + b.savings, 0);
  const hasData = incomes.length > 0 || expenses.length > 0;
  const fileDate = now.toISOString().slice(0, 10);
  // ASCII-safe slug appended to export filenames so the user can tell exports
  // for the same period but different accounts apart.
  const accountSlug = React.useMemo(() => {
    if (!accountLabel) return "";
    const slug = accountLabel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug ? `-${slug}` : "";
  }, [accountLabel]);

  function exportExpenses() {
    const csv = toCSV(
      expenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        type: e.type,
        amount: money.fromUSD(e.amount).toFixed(2),
        currency: money.currency,
        description: e.description ?? "",
      }))
    );
    downloadCSV(`arka-expenses-${money.currency}${accountSlug}-${fileDate}.csv`, csv);
    toast.success(t("toasts.expensesCsv"));
  }

  function exportIncome() {
    const csv = toCSV(
      incomes.map((i) => ({
        id: i.id,
        date: i.date,
        category: i.category,
        amount: money.fromUSD(i.amount).toFixed(2),
        currency: money.currency,
        description: i.description ?? "",
      }))
    );
    downloadCSV(`arka-income-${money.currency}${accountSlug}-${fileDate}.csv`, csv);
    toast.success(t("toasts.incomeCsv"));
  }

  function exportSummary() {
    const csv = toCSV(
      last6.map((r) => ({
        month: r.month,
        income: money.fromUSD(r.income).toFixed(2),
        expense: money.fromUSD(r.expense).toFixed(2),
        savings: money.fromUSD(r.savings).toFixed(2),
        savingsRate: r.rate.toFixed(2),
        currency: money.currency,
      }))
    );
    downloadCSV(`arka-summary-${money.currency}${accountSlug}-${fileDate}.csv`, csv);
    toast.success(t("toasts.summaryCsv"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AccountFilter />
            <Button size="sm" variant="outline" onClick={exportSummary} disabled={!hasData}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{t("summary")}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={exportIncome} disabled={incomes.length === 0}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{tNav("income")}</span>
            </Button>
            <Button size="sm" onClick={exportExpenses} disabled={expenses.length === 0}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{tNav("expenses")}</span>
            </Button>
          </div>
        }
      />

      {accountLabel && hasData && (
        <p className="text-xs text-muted-foreground">
          {t("filteredBy", { name: accountLabel })}
        </p>
      )}

      {!hasData ? (
        <EmptyState
          icon={<FileBarChart2 className="h-5 w-5" />}
          title={accountLabel ? t("emptyAccountTitle", { name: accountLabel }) : t("emptyTitle")}
          description={accountLabel ? t("emptyAccountDesc") : t("emptyDesc")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard
              label={t("sixMonthIncome")}
              value={money.format(totalIncome)}
              icon={<TrendingUp className="h-4 w-4" />}
              tone="success"
            />
            <KPICard
              label={t("sixMonthSpend")}
              value={money.format(totalExpense)}
              icon={<TrendingDown className="h-4 w-4" />}
            />
            <KPICard
              label={t("sixMonthSavings")}
              value={money.format(totalSavings)}
              icon={<PiggyBank className="h-4 w-4" />}
              tone="success"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileBarChart2 className="h-4 w-4" />
                  {t("cashflow")}
                </CardTitle>
                <CardDescription>{t("cashflowDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <CashflowChart incomes={incomes} expenses={expenses} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PiggyBank className="h-4 w-4" />
                  {t("monthlySavings")}
                </CardTitle>
                <CardDescription>{t("monthlySavingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <SavingsTrendChart incomes={incomes} expenses={expenses} />
              </CardContent>
            </Card>
          </div>

          <Card data-tutorial="main">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("breakdown")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("monthCol")}</TableHead>
                    <TableHead className="text-right">{t("incomeCol")}</TableHead>
                    <TableHead className="text-right">{t("expensesCol")}</TableHead>
                    <TableHead className="text-right">{t("savingsCol")}</TableHead>
                    <TableHead className="text-right">{t("rate")}</TableHead>
                    <TableHead>{t("babylon")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {last6.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="arka-number text-right text-success">
                        {money.format(row.income)}
                      </TableCell>
                      <TableCell className="arka-number text-right text-destructive">
                        {money.format(row.expense)}
                      </TableCell>
                      <TableCell className="arka-number text-right font-medium">
                        {money.format(row.savings)}
                      </TableCell>
                      <TableCell className="arka-number text-right">
                        {row.rate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.rate >= 10 ? "success" : "warning"}>
                          {row.rate >= 10 ? t("onTrack") : t("below10")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
