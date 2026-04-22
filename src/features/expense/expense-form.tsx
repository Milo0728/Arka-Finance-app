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
import type { Expense, ExpenseCategory, ExpenseType } from "@/types";

type Values = {
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  description?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editing }: Props) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("expenses");
  const tForm = useTranslations("expenses.form");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(tForm("positive")),
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
        type: z.enum(["fixed", "variable"]),
        date: z.string().min(1),
        description: z.string().optional(),
      }),
    [tForm]
  );

  const moneyRate = money.rate;
  const defaults = React.useMemo<Values>(
    () => ({
      amount: editing ? Number((editing.amount * moneyRate).toFixed(2)) : 0,
      category: (editing?.category as ExpenseCategory) ?? "food",
      type: (editing?.type as ExpenseType) ?? "variable",
      date: editing?.date ?? new Date().toISOString().slice(0, 10),
      description: editing?.description ?? "",
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
    const payload = { ...values, amount: money.toUSD(values.amount) };
    if (editing) {
      await updateExpense(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      await addExpense({ ...payload, userId });
      toast.success(t("toasts.added"));
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {tForm("amount")} ({money.currency})
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {money.currency !== money.baseCurrency && (
                <p className="text-[11px] text-muted-foreground">
                  {tForm("storedIn", {
                    base: money.baseCurrency,
                    rate: money.rate.toFixed(4),
                    currency: money.currency,
                  })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{tForm("date")}</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label>{tForm("type")}</Label>
              <Select
                defaultValue={getValues("type")}
                onValueChange={(v) => setValue("type", v as ExpenseType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variable">{labels.expenseType("variable")}</SelectItem>
                  <SelectItem value="fixed">{labels.expenseType("fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tForm("descriptionLabel")}</Label>
            <Input placeholder={tForm("descriptionPlaceholder")} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? tCommon("saveChanges") : tForm("addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
