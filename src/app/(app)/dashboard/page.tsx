"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import { BabylonWidget } from "@/components/dashboard/babylon-widget";
import { CashflowChart, CategoryPieChart, SavingsTrendChart } from "@/components/dashboard/lazy-charts";
import { HealthScore } from "@/components/dashboard/health-score";
import { InsightsList } from "@/components/dashboard/insights-list";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import {
  computeHealthScore,
  filterByMonth,
  monthlyBalance,
  monthlyExpenses as getMonthlyExpenses,
  monthlyIncome as getMonthlyIncome,
  savingsRate,
  totalBalance,
} from "@/utils/finance";
import { generateInsights } from "@/utils/insights";
import { subMonths } from "date-fns";

export default function DashboardPage() {
  const incomes = useFinanceStore((s) => s.incomes);
  const expenses = useFinanceStore((s) => s.expenses);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useFinanceStore((s) => s.goals);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const profile = useFinanceStore((s) => s.profile);
  const money = useMoney();
  const locale = useLocale();
  const labels = useLabels();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const displayName = profile?.name?.split(" ")[0] ?? t("friend");

  const now = React.useMemo(() => new Date(), []);
  const prev = React.useMemo(() => subMonths(now, 1), [now]);

  const derived = React.useMemo(() => {
    const mIncome = getMonthlyIncome(incomes, now);
    const mExpense = getMonthlyExpenses(expenses, now);
    const prevIncome = getMonthlyIncome(incomes, prev);
    const prevExpense = getMonthlyExpenses(expenses, prev);
    const balance = totalBalance(incomes, expenses);
    const mBalance = monthlyBalance(incomes, expenses, now);
    const prevBalance = monthlyBalance(incomes, expenses, prev);
    const rate = savingsRate(mIncome, mExpense);
    const prevRate = savingsRate(prevIncome, prevExpense);
    return {
      mIncome,
      mExpense,
      balance,
      rate,
      balanceDelta:
        prevBalance !== 0 ? ((mBalance - prevBalance) / Math.max(Math.abs(prevBalance), 1)) * 100 : 0,
      incomeDelta: prevIncome !== 0 ? ((mIncome - prevIncome) / Math.max(prevIncome, 1)) * 100 : 0,
      expenseDelta: prevExpense !== 0 ? ((mExpense - prevExpense) / Math.max(prevExpense, 1)) * 100 : 0,
      savingsDelta: prevRate !== 0 ? rate - prevRate : 0,
    };
  }, [incomes, expenses, now, prev]);

  const { mIncome, mExpense, balance, rate, balanceDelta, incomeDelta, expenseDelta, savingsDelta } = derived;

  const hasData = incomes.length > 0 || expenses.length > 0;

  const score = React.useMemo(
    () => computeHealthScore({ incomes, expenses, budgets, goals }),
    [incomes, expenses, budgets, goals]
  );

  const categoryLabel = labels.category;
  const moneyFormat = money.format;
  const insights = React.useMemo(
    () =>
      generateInsights({
        incomes,
        expenses,
        budgets,
        goals,
        subscriptions,
        format: moneyFormat,
        categoryLabel,
      }).slice(0, 5),
    [incomes, expenses, budgets, goals, subscriptions, moneyFormat, categoryLabel]
  );
  const thisMonthExpenses = React.useMemo(() => filterByMonth(expenses, now), [expenses, now]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div data-tutorial="welcome">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {t("greeting", { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subheading", {
              period: now.toLocaleString(locale, { month: "long", year: "numeric" }),
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">{tCommon("export")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/expenses">
              {t("reviewExpenses")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div data-tutorial="balance">
          <KPICard
            label={t("netBalance")}
            value={money.format(balance)}
            delta={balanceDelta}
            deltaLabel={t("vsLastMonth")}
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>
        <div data-tutorial="income">
          <KPICard
            label={t("incomeThisMonth")}
            value={money.format(mIncome)}
            delta={incomeDelta}
            deltaLabel={t("vsLastMonth")}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
          />
        </div>
        <div data-tutorial="expenses">
          <KPICard
            label={t("expensesThisMonth")}
            value={money.format(mExpense)}
            delta={-expenseDelta}
            deltaLabel={t("lowerIsBetter")}
            icon={<TrendingDown className="h-4 w-4" />}
          />
        </div>
        <KPICard
          label={t("savingsRate")}
          value={`${rate.toFixed(1)}%`}
          delta={savingsDelta}
          deltaLabel={rate >= 10 ? t("onBabylonTarget") : t("belowBabylonTarget")}
          icon={<PiggyBank className="h-4 w-4" />}
          tone={rate >= 10 ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]" data-tutorial="charts">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base">{t("cashflow")}</CardTitle>
              <CardDescription>{t("cashflowSub")}</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <LegendDot color="#22c55e" label={t("legendIncome")} />
              <LegendDot color="#ef4444" label={t("legendExpense")} />
            </div>
          </CardHeader>
          <CardContent>
            <CashflowChart incomes={incomes} expenses={expenses} />
          </CardContent>
        </Card>

        <BabylonWidget monthlyIncome={mIncome} monthlyExpenses={mExpense} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("spendingByCategory")}</CardTitle>
            <CardDescription>{t("thisMonth")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart expenses={thisMonthExpenses} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("savingsTrend")}</CardTitle>
            <CardDescription>{t("savingsTrendSub")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SavingsTrendChart incomes={incomes} expenses={expenses} />
          </CardContent>
        </Card>

        <div data-tutorial="score" className="xl:col-span-1">
          <HealthScore score={score} hasData={hasData} />
        </div>
      </div>

      <div data-tutorial="insights">
        <InsightsList insights={insights} title={t("arkaInsights")} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
