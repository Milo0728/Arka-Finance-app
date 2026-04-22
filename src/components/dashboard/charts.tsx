"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Expense, ExpenseCategory, Income } from "@/types";
import { expensesByCategory, incomeVsExpenseSeries } from "@/utils/finance";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "#22c55e",
  transport: "#0ea5e9",
  housing: "#6366f1",
  entertainment: "#f97316",
  utilities: "#14b8a6",
  subscriptions: "#ec4899",
  health: "#ef4444",
  education: "#8b5cf6",
  shopping: "#eab308",
  savings: "#10b981",
  debt: "#f43f5e",
  other: "#64748b",
};

function EmptyChart({ height = 280 }: { height?: number }) {
  const t = useTranslations("dashboard");
  return (
    <div
      className="flex w-full items-center justify-center rounded-md border border-dashed bg-muted/20 text-sm text-muted-foreground"
      style={{ height }}
    >
      <div className="px-6 text-center">
        <p className="font-medium text-foreground">{t("emptyChartTitle")}</p>
        <p className="mt-1 text-xs">{t("emptyChartDesc")}</p>
      </div>
    </div>
  );
}

export function CashflowChart({ incomes, expenses }: { incomes: Income[]; expenses: Expense[] }) {
  const money = useMoney();
  const labels = useLabels();

  if (incomes.length === 0 && expenses.length === 0) {
    return <EmptyChart height={280} />;
  }

  const data = incomeVsExpenseSeries(incomes, expenses, 6).map((b) => ({
    label: labels.monthShort(b.monthIndex),
    income: money.fromUSD(b.income),
    expense: money.fromUSD(b.expense),
    savings: money.fromUSD(b.savings),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => money.formatCompact(money.toUSD(v))}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number) => money.format(money.toUSD(value))}
        />
        <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeFill)" />
        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SavingsTrendChart({ incomes, expenses }: { incomes: Income[]; expenses: Expense[] }) {
  const money = useMoney();
  const labels = useLabels();

  if (incomes.length === 0 && expenses.length === 0) {
    return <EmptyChart height={220} />;
  }

  const data = incomeVsExpenseSeries(incomes, expenses, 6).map((b) => ({
    label: labels.monthShort(b.monthIndex),
    savings: money.fromUSD(b.savings),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 0, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => money.formatCompact(money.toUSD(v))}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number) => money.format(money.toUSD(value))}
        />
        <Bar dataKey="savings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ expenses }: { expenses: Expense[] }) {
  const money = useMoney();
  const labels = useLabels();
  const tExpenses = useTranslations("expenses");
  const grouped = expensesByCategory(expenses);
  const data = Object.entries(grouped)
    .map(([name, value]) => ({ name, value: money.fromUSD(value) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        {tExpenses("emptyPieTitle")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as ExpenseCategory] ?? "#64748b"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number, name) => [
            money.format(money.toUSD(value)),
            labels.expenseCategory(String(name)) ?? String(name),
          ]}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
          formatter={(value) => labels.expenseCategory(String(value)) ?? String(value)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
