"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { INCOME_CATEGORIES } from "@/lib/categories";
import type { Income, IncomeCategory } from "@/types";

const schema = z.object({
  amount: z.coerce.number().positive("Must be a positive number"),
  category: z.enum(["salary", "freelance", "investment", "business", "gift", "other"]),
  date: z.string().min(1),
  description: z.string().optional(),
});

type Values = z.infer<typeof schema>;

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

  const defaults = React.useMemo<Values>(
    () => ({
      amount: editing ? Number(money.fromUSD(editing.amount).toFixed(2)) : 0,
      category: (editing?.category as IncomeCategory) ?? "salary",
      date: editing?.date ?? new Date().toISOString().slice(0, 10),
      description: editing?.description ?? "",
    }),
    [editing, money]
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
      await updateIncome(editing.id, payload);
      toast.success("Income updated");
    } else {
      await addIncome({ ...payload, userId });
      toast.success("Income added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit income" : "Log new income"}</DialogTitle>
          <DialogDescription>Money flowing in — whether salary, side hustle or dividends.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount ({money.currency})</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {money.currency !== money.baseCurrency && (
                <p className="text-[11px] text-muted-foreground">
                  Stored in {money.baseCurrency} at ~{money.rate.toFixed(4)} {money.currency}/{money.baseCurrency}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              defaultValue={getValues("category")}
              onValueChange={(v) => setValue("category", v as IncomeCategory)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input placeholder="e.g. April salary, design invoice" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
