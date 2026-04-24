"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Upload, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryPieChart } from "@/components/dashboard/lazy-charts";
import { ExpenseForm } from "@/features/expense/expense-form";
import { ImportCsvDialog } from "@/features/import/import-csv-dialog";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { DEFAULT_BUCKET_ID, filterByAccount } from "@/utils/accounts";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { monthlyExpenses as getMonthlyExpenses, sum, topCategories } from "@/utils/finance";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/categories";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const expensesAll = useFinanceStore((s) => s.expenses);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const removeExpense = useFinanceStore((s) => s.removeExpense);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const tAccounts = useTranslations("accounts");

  // Name of the active account, used by the "no activity for this account"
  // empty-state branch. Null when there's no filter applied.
  const accountLabel = React.useMemo(() => {
    if (!activeAccountId) return null;
    if (activeAccountId === DEFAULT_BUCKET_ID) return tAccounts("filterUnassigned");
    return accounts.find((a) => a.id === activeAccountId)?.name ?? null;
  }, [activeAccountId, accounts, tAccounts]);
  const [open, setOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const importEnabled = isFeatureEnabled("csvImport");

  // Account filter narrows the dataset BEFORE every derived metric so KPIs and
  // table stay coherent. When activeAccountId is null we keep the consolidated view.
  const expenses = React.useMemo(
    () => filterByAccount(expensesAll, activeAccountId),
    [expensesAll, activeAccountId]
  );

  const total = sum(expenses, (e) => e.amount);
  const thisMonth = getMonthlyExpenses(expenses);
  const top = topCategories(expenses, 1)[0];

  const filtered = expenses.filter((e) => {
    const matchesSearch = !search || (e.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setOpen(true);
  }

  async function onDelete(expense: Expense) {
    await removeExpense(expense.id);
    toast.success(t("toasts.removed"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" data-tutorial="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {importEnabled && (
              <Button onClick={() => setImportOpen(true)} size="sm" variant="outline">
                <Upload className="h-4 w-4" />
                <span className="ml-1">{t("importCsv")}</span>
              </Button>
            )}
            <Button onClick={openNew} size="sm" data-tutorial="add-button">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("logExpense")}</span>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label={t("allTime")} value={money.format(total)} icon={<Wallet className="h-4 w-4" />} />
        <KPICard label={t("thisMonth")} value={money.format(thisMonth)} tone="warning" />
        <KPICard
          label={t("topCategory")}
          value={top ? (labels.expenseCategory(top.category) ?? top.category) : t("dash")}
          sub={top ? money.format(top.amount) : t("noDataYet")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card data-tutorial="main">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("transactions")}</CardTitle>
            {/* Filter toolbar: full-width inputs on mobile (so they stack to
                the viewport) and auto widths from sm upward. Prevents the
                row from horizontally overflowing on small screens. */}
            <div className="flex flex-wrap items-center gap-2">
              <AccountFilter />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full sm:w-48"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-full sm:w-36">
                  <SelectValue placeholder={t("filterCategoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCategories")}</SelectItem>
                  {EXPENSE_CATEGORY_VALUES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {labels.expenseCategory(c) ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-full sm:w-28">
                  <SelectValue placeholder={t("filterTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="fixed">{t("fixed")}</SelectItem>
                  <SelectItem value="variable">{t("variable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  // Three branches, narrowest first:
                  //   1. account filter active AND nothing for that account
                  //   2. search/category/type filters trimmed everything
                  //   3. user literally has no expenses yet
                  title={
                    accountLabel && expenses.length === 0 && expensesAll.length > 0
                      ? t("emptyAccountTitle", { name: accountLabel })
                      : t("noMatchTitle")
                  }
                  description={
                    accountLabel && expenses.length === 0 && expensesAll.length > 0
                      ? t("emptyAccountDesc")
                      : t("noMatchDesc")
                  }
                  action={
                    <Button size="sm" onClick={openNew}>
                      <Plus className="h-4 w-4" />
                      <span className="ml-1">{t("logExpense")}</span>
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead>{t("table.category")}</TableHead>
                    <TableHead>{t("table.type")}</TableHead>
                    <TableHead>{t("table.description")}</TableHead>
                    <TableHead className="text-right">{t("table.amount")}</TableHead>
                    <TableHead className="w-24 text-right">{tCommon("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(e.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {labels.expenseCategory(e.category) ?? e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={e.type === "fixed" ? "muted" : "outline"}>
                          {labels.expenseType(e.type)}
                        </Badge>
                      </TableCell>
                      {/* Cap description width so one long note doesn't
                          stretch the table beyond the viewport. Full text is
                          still available on hover via `title`. */}
                      <TableCell className="max-w-[220px] truncate text-sm" title={e.description ?? undefined}>
                        {e.description ?? t("dash")}
                      </TableCell>
                      <TableCell className="arka-number text-right font-medium text-destructive">
                        -{money.format(e.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label={tCommon("edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(e)}
                            aria-label={tCommon("delete")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("byCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart expenses={expenses} />
          </CardContent>
        </Card>
      </div>

      <ExpenseForm open={open} onOpenChange={setOpen} editing={editing} />
      {importEnabled && <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />}
    </div>
  );
}
