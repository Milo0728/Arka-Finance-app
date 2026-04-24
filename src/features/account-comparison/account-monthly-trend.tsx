"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import type { AccountComparisonRow } from "@/utils/account-comparison";

interface Props {
  rows: AccountComparisonRow[];
  /** Which metric to chart per account. Default "balance". */
  metric?: "income" | "expense" | "balance";
}

/**
 * Level 2.3 — per-account monthly trend using a shared X axis. We flatten
 * every row's `monthlySeries` into one array keyed by "Jan 2026" etc., then
 * render one `<Line />` per account.
 *
 * Palette rotates through brand-friendly tokens: too many accounts (> 6)
 * would make lines indistinguishable, but we cap the visible list in the
 * container component to avoid this.
 */
const PALETTE = [
  "#1ec47f", // brand primary
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
];

export function AccountMonthlyTrend({ rows, metric = "balance" }: Props) {
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("accountComparison.trend");

  // Build data rows keyed by month label. Each account contributes a field
  // named by its accountId (safe lookup because ids are Firestore/crypto).
  const data = React.useMemo(() => {
    if (rows.length === 0) return [];
    const months = rows[0].monthlySeries; // all rows share the same window
    return months.map((_, idx) => {
      const ref = months[idx];
      const entry: Record<string, string | number> = {
        month: `${labels.monthShort(ref.monthIndex)} ${String(ref.year).slice(-2)}`,
      };
      for (const row of rows) {
        const cell = row.monthlySeries[idx];
        const value = metric === "income" ? cell.income : metric === "expense" ? cell.expense : cell.balance;
        // Keys must be stable across renders — use accountId directly.
        entry[row.accountId] = value;
      }
      return entry;
    });
  }, [rows, labels, metric]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t(`metricLabel.${metric}`)}</p>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              // Compact formatter keeps the axis narrow on mobile (no 7-digit
              // numbers stacking under the chart).
              tickFormatter={(v: number) => money.formatCompact(v)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
              formatter={(value: number) => money.format(value)}
              labelStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            {rows.map((row, idx) => (
              <Line
                key={row.accountId}
                type="monotone"
                dataKey={row.accountId}
                name={row.label}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
