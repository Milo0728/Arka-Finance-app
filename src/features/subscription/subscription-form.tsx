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
import type { BillingCycle, Subscription } from "@/types";

type Values = {
  name: string;
  amount: number;
  billingCycle: BillingCycle;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Subscription | null;
}

export function SubscriptionForm({ open, onOpenChange, editing }: Props) {
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const updateSubscription = useFinanceStore((s) => s.updateSubscription);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("subscriptions");
  const tForm = useTranslations("subscriptions.form");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, tForm("giveName")),
        amount: z.coerce.number().positive(tForm("positive")),
        billingCycle: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
      }),
    [tForm]
  );

  const moneyRate = money.rate;
  const defaults = React.useMemo<Values>(
    () => ({
      name: editing?.name ?? "",
      amount: editing ? Number((editing.amount * moneyRate).toFixed(2)) : 0,
      billingCycle: (editing?.billingCycle as BillingCycle) ?? "monthly",
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
      await updateSubscription(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      await addSubscription({ ...payload, userId, category: "subscriptions" });
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
          <div className="space-y-2">
            <Label>{tForm("nameLabel")}</Label>
            <Input placeholder={tForm("namePlaceholder")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {tForm("amountLabel")} ({money.currency})
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tForm("billingLabel")}</Label>
              <Select
                defaultValue={getValues("billingCycle")}
                onValueChange={(v) => setValue("billingCycle", v as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{labels.billing("weekly")}</SelectItem>
                  <SelectItem value="monthly">{labels.billing("monthly")}</SelectItem>
                  <SelectItem value="quarterly">{labels.billing("quarterly")}</SelectItem>
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
              {editing ? tCommon("saveChanges") : tForm("addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
