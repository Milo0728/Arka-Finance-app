"use client";

import * as React from "react";
import { Sparkles, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { InsightsList } from "@/components/dashboard/insights-list";
import { HealthScore } from "@/components/dashboard/health-score";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { generateInsights } from "@/utils/insights";
import { computeHealthScore, topCategories } from "@/utils/finance";
import { DEFAULT_BUCKET_ID, filterByAccount } from "@/utils/accounts";
import { AccountComparison } from "@/features/account-comparison/account-comparison";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function InsightsPage() {
  const incomesAll = useFinanceStore((s) => s.incomes);
  const expensesAll = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useFinanceStore((s) => s.goals);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("insights");
  const tAccounts = useTranslations("accounts");

  // Filter the two sources that do carry accountId. Budgets, goals and
  // subscriptions stay global by design — they aren't per-account entities.
  const incomes = React.useMemo(
    () => filterByAccount(incomesAll, activeAccountId),
    [incomesAll, activeAccountId]
  );
  const expenses = React.useMemo(
    () => filterByAccount(expensesAll, activeAccountId),
    [expensesAll, activeAccountId]
  );

  const accountLabel = React.useMemo(() => {
    if (!activeAccountId) return null;
    if (activeAccountId === DEFAULT_BUCKET_ID) return tAccounts("filterUnassigned");
    return accounts.find((a) => a.id === activeAccountId)?.name ?? null;
  }, [activeAccountId, accounts, tAccounts]);

  const insights = React.useMemo(
    () =>
      generateInsights({
        incomes,
        expenses,
        budgets,
        goals,
        subscriptions,
        format: money.format,
        categoryLabel: labels.category,
      }),
    [incomes, expenses, budgets, goals, subscriptions, money.format, labels.category]
  );
  const score = React.useMemo(
    () => computeHealthScore({ incomes, expenses, budgets, goals }),
    [incomes, expenses, budgets, goals]
  );
  const categories = React.useMemo(() => topCategories(expenses, 5), [expenses]);
  const hasData = incomes.length > 0 || expenses.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={<AccountFilter />}
      />

      {/* Account comparison sits at the top of /insights when the user has
          multiple effective buckets. "General" (entries without accountId)
          always counts as an implicit account, so one real account already
          makes two buckets — that's why the check is `>= 1` and not `>= 2`. */}
      {isFeatureEnabled("multiAccount") && accounts.length >= 1 && <AccountComparison />}

      {/* Scope badge — makes it unambiguous whose insights/score you are
          looking at. Budgets/goals are noted as "global" so a low adherence
          signal isn't misread as account-specific. */}
      {accountLabel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <Badge variant="default" className="gap-1">
            <Landmark className="h-3 w-3" />
            {t("scopeAccount", { name: accountLabel })}
          </Badge>
          <span className="text-muted-foreground">{t("scopeAccountHint")}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <Badge variant="muted">{t("scopeAll")}</Badge>
          <span className="text-muted-foreground">{t("scopeAllHint")}</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div data-tutorial="main">
          <InsightsList
            insights={insights}
            title={accountLabel ? t("allForAccount", { name: accountLabel }) : t("all")}
          />
        </div>
        <div className="space-y-4">
          <HealthScore
            score={score}
            hasData={hasData}
            subtitle={accountLabel ? t("scoreForAccount", { name: accountLabel }) : undefined}
            scopedToAccount={!!accountLabel}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {accountLabel
                  ? t("topCategoriesTitleForAccount", { name: accountLabel })
                  : t("topCategoriesTitle")}
              </CardTitle>
              <CardDescription>{t("topCategoriesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>
              ) : (
                categories.map((c, idx) => (
                  <div key={c.category} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{labels.expenseCategory(c.category) ?? c.category}</span>
                    <span className="arka-number text-muted-foreground">
                      {money.format(c.amount)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
