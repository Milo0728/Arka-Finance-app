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
import { INCOME_CATEGORY_VALUES } from "@/lib/categories";
import type { Income, IncomeCategory, IncomeFrequency } from "@/types";

type Values = {
  amount: number;
  category: IncomeCategory;
  frequency: IncomeFrequency;
  date: string;
  description?: string;
};

const FREQUENCIES: IncomeFrequency[] = ["once", "weekly", "monthly", "quarterly", "yearly"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Income | null;
}

export function IncomeForm({ open, onOpenChange, editing }: Props) {
  const addIncome = useFinanceStore((s) => s.addIncome);
  const updateIncome = useFinanceStore((s) => s.updateIncome);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("income");
  const tForm = useTranslations("income.form");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(tForm("positive")),
        category: z.enum(["salary", "freelance", "investment", "business", "gift", "other"]),
        frequency: z.enum(["once", "weekly", "monthly", "quarterly", "yearly"]),
        date: z.string().min(1),
        description: z.string().optional(),
      }),
    [tForm]
  );

  const moneyRate = money.rate;
  const defaults = React.useMemo<Values>(
    () => ({
      amount: editing ? Number((editing.amount * moneyRate).toFixed(2)) : 0,
      category: (editing?.category as IncomeCategory) ?? "salary",
      frequency: (editing?.frequency as IncomeFrequency) ?? "once",
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
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const currentFrequency = watch("frequency");
  const dateLabel = currentFrequency && currentFrequency !== "once" ? tForm("startDate") : tForm("date");

  async function onSubmit(values: Values) {
    const payload = { ...values, amount: money.toUSD(values.amount) };
    if (editing) {
      await updateIncome(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      await addIncome({ ...payload, userId });
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
              <Label>{dateLabel}</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tForm("frequency")}</Label>
              <Select
                defaultValue={getValues("frequency")}
                onValueChange={(v) => setValue("frequency", v as IncomeFrequency, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {labels.incomeFrequency(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tForm("category")}</Label>
              <Select
                defaultValue={getValues("category")}
                onValueChange={(v) => setValue("category", v as IncomeCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORY_VALUES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {labels.incomeCategory(c) ?? c}
                    </SelectItem>
                  ))}
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
