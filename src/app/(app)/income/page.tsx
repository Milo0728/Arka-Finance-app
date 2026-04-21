"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { IncomeForm } from "@/features/income/income-form";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { monthlyIncome as getMonthlyIncome, sum } from "@/utils/finance";
import { categoryLabel } from "@/lib/categories";
import type { Income } from "@/types";

export default function IncomePage() {
  const { incomes, removeIncome } = useFinanceStore();
  const money = useMoney();
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Income | null>(null);

  const total = sum(incomes, (i) => i.amount);
  const thisMonth = getMonthlyIncome(incomes);
  const avg = incomes.length ? total / Math.max(1, new Set(incomes.map((i) => i.date.slice(0, 7))).size) : 0;

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(income: Income) {
    setEditing(income);
    setOpen(true);
  }

  async function onDelete(income: Income) {
    await removeIncome(income.id);
    toast.success("Income removed");
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("logIncome")}</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label={t("allTime")}
          value={money.format(total)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="success"
        />
        <KPICard label={t("thisMonth")} value={money.format(thisMonth)} />
        <KPICard label={t("averageMonth")} value={money.format(avg)} />
      </div>

      {incomes.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("logIncome")}</span>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(i.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel(i.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{i.description ?? "—"}</TableCell>
                    <TableCell className="arka-number text-right font-medium text-success">
                      +{money.format(i.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(i)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(i)}
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
          </CardContent>
        </Card>
      )}

      <IncomeForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
