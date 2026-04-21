"use client";

import * as React from "react";
import { Download, FileBarChart2, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CashflowChart, SavingsTrendChart } from "@/components/dashboard/lazy-charts";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { monthlyExpenses, monthlyIncome, savingsRate } from "@/utils/finance";
import { toCSV, downloadCSV } from "@/utils/export";

export default function ReportsPage() {
  const { incomes, expenses } = useFinanceStore();
  const money = useMoney();
  const t = useTranslations("reports");
  const tNav = useTranslations("nav");
  const now = new Date();

  const last6 = Array.from({ length: 6 }, (_, i) => {
    const ref = subMonths(now, 5 - i);
    const income = monthlyIncome(incomes, ref);
    const expense = monthlyExpenses(expenses, ref);
    const rate = savingsRate(income, expense);
    return {
      month: format(ref, "MMM yyyy"),
      income,
      expense,
      savings: Math.max(0, income - expense),
      rate,
    };
  });

  const totalIncome = last6.reduce((a, b) => a + b.income, 0);
  const totalExpense = last6.reduce((a, b) => a + b.expense, 0);
  const totalSavings = last6.reduce((a, b) => a + b.savings, 0);

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
    downloadCSV(`arka-expenses-${money.currency}-${format(now, "yyyy-MM-dd")}.csv`, csv);
    toast.success("Expenses exported as CSV");
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
    downloadCSV(`arka-income-${money.currency}-${format(now, "yyyy-MM-dd")}.csv`, csv);
    toast.success("Income exported as CSV");
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
    downloadCSV(`arka-summary-${money.currency}-${format(now, "yyyy-MM-dd")}.csv`, csv);
    toast.success("Summary exported as CSV");
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportSummary}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{t("summary")}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={exportIncome}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{tNav("income")}</span>
            </Button>
            <Button size="sm" onClick={exportExpenses}>
              <Download className="h-4 w-4" />
              <span className="ml-1">{tNav("expenses")}</span>
            </Button>
          </div>
        }
      />

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
              Cashflow
            </CardTitle>
            <CardDescription>Income vs expenses over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart incomes={incomes} expenses={expenses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-4 w-4" />
              Monthly savings
            </CardTitle>
            <CardDescription>How much stayed in the treasury each month.</CardDescription>
          </CardHeader>
          <CardContent>
            <SavingsTrendChart incomes={incomes} expenses={expenses} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Month-by-month breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Savings</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Babylon</TableHead>
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
                  <TableCell className="arka-number text-right">{row.rate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={row.rate >= 10 ? "success" : "warning"}>
                      {row.rate >= 10 ? "On track" : "Below 10%"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
