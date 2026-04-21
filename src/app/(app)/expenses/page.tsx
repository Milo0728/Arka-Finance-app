"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
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
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { monthlyExpenses as getMonthlyExpenses, sum, topCategories } from "@/utils/finance";
import { EXPENSE_CATEGORIES, categoryLabel } from "@/lib/categories";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const { expenses, removeExpense } = useFinanceStore();
  const money = useMoney();
  const t = useTranslations("expenses");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

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
    toast.success("Expense removed");
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("logExpense")}</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="All-time" value={money.format(total)} icon={<Wallet className="h-4 w-4" />} />
        <KPICard label="This month" value={money.format(thisMonth)} tone="warning" />
        <KPICard
          label="Top category"
          value={top ? categoryLabel(top.category) : "—"}
          sub={top ? money.format(top.amount) : "No data yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Transactions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search descriptions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-28"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  title="No expenses match"
                  description="Clear your filters or log a new expense."
                  action={
                    <Button size="sm" onClick={openNew}>
                      <Plus className="h-4 w-4" />
                      <span className="ml-1">Log expense</span>
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(e.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabel(e.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={e.type === "fixed" ? "muted" : "outline"}>{e.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.description ?? "—"}</TableCell>
                      <TableCell className="arka-number text-right font-medium text-destructive">
                        -{money.format(e.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(e)}
                            aria-label="Delete"
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
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart expenses={expenses} />
          </CardContent>
        </Card>
      </div>

      <ExpenseForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
