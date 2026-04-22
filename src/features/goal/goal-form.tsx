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
import type { Goal } from "@/types";

type Values = {
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Goal | null;
}

export function GoalForm({ open, onOpenChange, editing }: Props) {
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const t = useTranslations("goals");
  const tForm = useTranslations("goals.form");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        title: z.string().min(2, tForm("giveName")),
        targetAmount: z.coerce.number().positive(tForm("positive")),
        currentAmount: z.coerce.number().min(0, tForm("nonNegative")),
        deadline: z.string().min(1, tForm("pickDeadline")),
      }),
    [tForm]
  );

  const moneyRate = money.rate;
  const defaults = React.useMemo<Values>(
    () => ({
      title: editing?.title ?? "",
      targetAmount: editing ? Number((editing.targetAmount * moneyRate).toFixed(2)) : 0,
      currentAmount: editing ? Number((editing.currentAmount * moneyRate).toFixed(2)) : 0,
      deadline:
        editing?.deadline ?? new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().slice(0, 10),
    }),
    [editing, moneyRate]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  async function onSubmit(values: Values) {
    const payload = {
      ...values,
      targetAmount: money.toUSD(values.targetAmount),
      currentAmount: money.toUSD(values.currentAmount),
    };
    if (editing) {
      await updateGoal(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      await addGoal({ ...payload, userId });
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
            <Label>{tForm("titleLabel")}</Label>
            <Input placeholder={tForm("titlePlaceholder")} {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {tForm("targetAmount")} ({money.currency})
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("targetAmount")} />
              {errors.targetAmount && (
                <p className="text-xs text-destructive">{errors.targetAmount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {tForm("savedSoFar")} ({money.currency})
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("currentAmount")} />
              {errors.currentAmount && (
                <p className="text-xs text-destructive">{errors.currentAmount.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tForm("deadline")}</Label>
            <Input type="date" {...register("deadline")} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
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
