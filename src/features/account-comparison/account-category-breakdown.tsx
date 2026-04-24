"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import type { AccountComparisonRow } from "@/utils/account-comparison";

interface Props {
  rows: AccountComparisonRow[];
}

const BOTH_ACCOUNTS_FALLBACK = "__first_two__";

/**
 * Level 2.2 — top categories per account. Two selectors let the user compare
 * exactly two accounts side-by-side; on mobile they stack, on desktop they
 * sit in a 2-column grid. Avoids heavy charts by using a simple bar-list.
 *
 * Why a list instead of a donut/pie: categories have highly unequal sizes
 * (housing dominates), making a pie hard to read. A ranked bar list is
 * accurate, mobile-friendly, and requires zero chart library code.
 */
export function AccountCategoryBreakdown({ rows }: Props) {
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("accountComparison.categories");

  // Default to the first two accounts. If only one is available, we still
  // show it (the side-by-side loses meaning but the breakdown is useful).
  const [leftId, setLeftId] = React.useState<string>(() => rows[0]?.accountId ?? BOTH_ACCOUNTS_FALLBACK);
  const [rightId, setRightId] = React.useState<string>(() => rows[1]?.accountId ?? BOTH_ACCOUNTS_FALLBACK);

  // Keep selections valid if accounts disappear (e.g. user deleted one).
  React.useEffect(() => {
    if (rows.length === 0) return;
    const ids = new Set(rows.map((r) => r.accountId));
    if (!ids.has(leftId)) setLeftId(rows[0].accountId);
    if (!ids.has(rightId)) setRightId(rows[1]?.accountId ?? rows[0].accountId);
  }, [rows, leftId, rightId]);

  const left = rows.find((r) => r.accountId === leftId) ?? rows[0];
  const right = rows.find((r) => r.accountId === rightId) ?? rows[1] ?? rows[0];

  if (!left) return null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <AccountPicker value={left.accountId} onChange={setLeftId} rows={rows} />
        {rows.length > 1 && (
          <AccountPicker value={right.accountId} onChange={setRightId} rows={rows} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CategoryList row={left} money={money} labels={labels} emptyLabel={t("empty")} />
        {rows.length > 1 && right && left.accountId !== right.accountId && (
          <CategoryList row={right} money={money} labels={labels} emptyLabel={t("empty")} />
        )}
      </div>
    </div>
  );
}

function AccountPicker({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: AccountComparisonRow[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rows.map((r) => (
          <SelectItem key={r.accountId} value={r.accountId}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CategoryList({
  row,
  money,
  labels,
  emptyLabel,
}: {
  row: AccountComparisonRow;
  money: ReturnType<typeof useMoney>;
  labels: ReturnType<typeof useLabels>;
  emptyLabel: string;
}) {
  if (row.topCategories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  // Use the top category's amount as the 100% reference — relative bars
  // read more naturally than absolute ones when the user is comparing
  // ordering, not absolute spend.
  const max = row.topCategories[0]?.amount ?? 1;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {row.label}
      </p>
      <ul className="space-y-2">
        {row.topCategories.map((entry) => {
          const pct = max > 0 ? (entry.amount / max) * 100 : 0;
          return (
            <li key={entry.category} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  {labels.expenseCategory(entry.category) ?? entry.category}
                </span>
                <span
                  className="arka-number truncate text-xs text-muted-foreground"
                  title={money.format(entry.amount)}
                >
                  {money.formatCompact(entry.amount)}
                </span>
              </div>
              <Progress value={pct} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
