"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/hooks/useMoney";
import { formatPercent } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type {
  AccountComparisonRow,
  ComparisonHighlights,
} from "@/utils/account-comparison";

type SortKey = "label" | "totalIncome" | "totalExpenses" | "balance" | "savingsRate";
type SortDir = "asc" | "desc";

interface Props {
  rows: AccountComparisonRow[];
  highlights: ComparisonHighlights;
}

/**
 * Level 2.1 — sortable table. Keeps the shadcn Table wrapper so horizontal
 * overflow on narrow screens is auto-handled. Headers toggle sort direction;
 * winners are highlighted in-cell (not whole row) so the user reads the
 * value first, the "best" cue second.
 */
export function AccountComparisonTable({ rows, highlights }: Props) {
  const money = useMoney();
  const t = useTranslations("accountComparison.table");

  const [sortKey, setSortKey] = React.useState<SortKey>("balance");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "label" ? "asc" : "desc");
    }
  }

  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = typeof va === "number" ? va : 0;
      const nb = typeof vb === "number" ? vb : 0;
      return sortDir === "asc" ? na - nb : nb - na;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function SortHeader({ keyName, label, align = "left" }: { keyName: SortKey; label: string; align?: "left" | "right" }) {
    const active = sortKey === keyName;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 gap-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground",
          align === "right" && "ml-auto"
        )}
        onClick={() => toggleSort(keyName)}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} />
      </Button>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortHeader keyName="label" label={t("account")} />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader keyName="totalIncome" label={t("income")} align="right" />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader keyName="totalExpenses" label={t("expenses")} align="right" />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader keyName="balance" label={t("balance")} align="right" />
          </TableHead>
          <TableHead className="text-right">
            <SortHeader keyName="savingsRate" label={t("savings")} align="right" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.accountId}>
            <TableCell className="max-w-[160px] truncate font-medium" title={row.label}>
              {row.label}
            </TableCell>
            <TableCell
              className={cn(
                "arka-number text-right",
                highlights.topIncomeId === row.accountId && "font-semibold text-success"
              )}
              title={money.format(row.totalIncome)}
            >
              {money.formatCompact(row.totalIncome)}
            </TableCell>
            <TableCell
              className={cn(
                "arka-number text-right",
                highlights.topExpenseId === row.accountId && "font-semibold text-warning"
              )}
              title={money.format(row.totalExpenses)}
            >
              {money.formatCompact(row.totalExpenses)}
            </TableCell>
            <TableCell
              className={cn(
                "arka-number text-right font-medium",
                row.balance < 0 && "text-destructive"
              )}
              title={money.format(row.balance)}
            >
              {money.formatCompact(row.balance)}
            </TableCell>
            <TableCell
              className={cn(
                "arka-number text-right",
                highlights.topSavingsId === row.accountId && "font-semibold text-success"
              )}
            >
              {formatPercent(row.savingsRate * 100, 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
