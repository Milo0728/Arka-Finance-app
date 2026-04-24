"use client";

import * as React from "react";
import { Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  getAccountComparison,
  getComparisonHighlights,
} from "@/utils/account-comparison";
import { AccountComparisonSummary } from "./account-comparison-summary";
import { AccountComparisonTable } from "./account-comparison-table";
import { AccountCategoryBreakdown } from "./account-category-breakdown";
import { AccountMonthlyTrend } from "./account-monthly-trend";
import { AccountComparisonInsights } from "./account-comparison-insights";

/**
 * Top-level account comparison block. Hides itself when there's only one
 * account (otherwise the "comparison" has nothing to compare). Uses shadcn
 * Tabs to layer the progressive levels without dumping everything on screen:
 *
 *   Summary  (L1) — quick-scan cards with badges
 *   Table    (L2) — sortable detailed table
 *   Categories (L2) — top categories, side-by-side
 *   Trend    (L2) — 6-month lines
 *   Insights (L3) — auto-generated callouts
 *
 * The entire block reads from the finance store and computes rows inside a
 * single useMemo — every tab below consumes the same data.
 */
export function AccountComparison() {
  const incomes = useFinanceStore((s) => s.incomes);
  const expenses = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const t = useTranslations("accountComparison");
  const tAccounts = useTranslations("accounts");

  const rows = React.useMemo(
    () => getAccountComparison(incomes, expenses, accounts, tAccounts("filterUnassigned")),
    [incomes, expenses, accounts, tAccounts]
  );
  const highlights = React.useMemo(() => getComparisonHighlights(rows), [rows]);

  // Guard: need at least one real account to have something meaningful to
  // compare against "General" (unassigned). The wrapper in the insights
  // page already applies the same rule — this one keeps the component
  // safely droppable anywhere. Dev-only log for the "why isn't this
  // rendering?" case the user hit.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[AccountComparison]", {
      accountsLength: accounts.length,
      rowsLength: rows.length,
    });
  }
  if (accounts.length < 1) return null;
  // Also bail if, after dropping empty buckets, we have fewer than 2 rows —
  // nothing to compare even if the user has accounts but all are empty.
  if (rows.length < 2) return null;

  // Safety net — if every bucket is empty we still render the tabs but the
  // summary shows zero cards. The empty states inside each sub-component
  // handle that gracefully, so we keep the block mounted for consistency.

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          {/* Horizontal scroll on mobile when the 5 tab triggers don't fit.
              Keeps labels short (one word) to minimise the need for it. */}
          <TabsList className="flex w-full flex-wrap sm:grid sm:grid-cols-5">
            <TabsTrigger value="summary" className="flex-1 sm:flex-none">
              {t("tabs.summary")}
            </TabsTrigger>
            <TabsTrigger value="table" className="flex-1 sm:flex-none">
              {t("tabs.table")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 sm:flex-none">
              {t("tabs.categories")}
            </TabsTrigger>
            <TabsTrigger value="trend" className="flex-1 sm:flex-none">
              {t("tabs.trend")}
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1 sm:flex-none">
              {t("tabs.insights")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <AccountComparisonSummary rows={rows} highlights={highlights} />
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <AccountComparisonTable rows={rows} highlights={highlights} />
          </TabsContent>
          <TabsContent value="categories" className="mt-4">
            <AccountCategoryBreakdown rows={rows} />
          </TabsContent>
          <TabsContent value="trend" className="mt-4">
            <AccountMonthlyTrend rows={rows} />
          </TabsContent>
          <TabsContent value="insights" className="mt-4">
            <AccountComparisonInsights rows={rows} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
