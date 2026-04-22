"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/categories";
import type { Budget, BudgetPeriod, ExpenseCategory } from "@/types";

type Values = {
  category: ExpenseCategory;
  limit: number;
  period: BudgetPeriod;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Budget | null;
}

export function BudgetForm({ open, onOpenChange, editing }: Props) {
  const addBudget = useFinanceStore((s) => s.addBudget);
  const updateBudget = useFinanceStore((s) => s.updateBudget);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("budgets");
  const tForm = useTranslations("budgets.form");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        category: z.enum([
          "food",
          "transport",
          "housing",
          "entertainment",
          "utilities",
          "subscriptions",
          "health",
          "education",
          "shopping",
          "savings",
          "debt",
          "other",
        ]),
        limit: z.coerce.number().positive(tForm("positive")),
        period: z.enum(["weekly", "monthly", "yearly"]),
      }),
    [tForm]
  );

  const moneyRate = money.rate;
  const defaults = React.useMemo<Values>(
    () => ({
      category: (editing?.category as ExpenseCategory) ?? "food",
      limit: editing ? Number((editing.limit * moneyRate).toFixed(2)) : 0,
      period: (editing?.period as BudgetPeriod) ?? "monthly",
    }),
    [editing, moneyRate]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  async function onSubmit(values: Values) {
    const payload = { ...values, limit: money.toUSD(values.limit) };
    if (editing) {
      await updateBudget(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      await addBudget({ ...payload, userId });
      toast.success(t("toasts.created"));
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("formEditTitle") : t("formNewTitle")}</DialogTitle>
          <DialogDescription>{t("formDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{tForm("category")}</Label>
            <Select
              defaultValue={getValues("category")}
              onValueChange={(v) => setValue("category", v as ExpenseCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORY_VALUES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {labels.expenseCategory(c) ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {tForm("limit")} ({money.currency})
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("limit")} />
              {errors.limit && <p className="text-xs text-destructive">{errors.limit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tForm("period")}</Label>
              <Select
                defaultValue={getValues("period")}
                onValueChange={(v) => setValue("period", v as BudgetPeriod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{labels.billing("weekly")}</SelectItem>
                  <SelectItem value="monthly">{labels.billing("monthly")}</SelectItem>
                  <SelectItem value="yearly">{labels.billing("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? tCommon("saveChanges") : tForm("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
