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
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { Budget, BudgetPeriod, ExpenseCategory } from "@/types";

const schema = z.object({
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
  limit: z.coerce.number().positive("Must be a positive number"),
  period: z.enum(["weekly", "monthly", "yearly"]),
});

type Values = z.infer<typeof schema>;

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

  const defaults = React.useMemo<Values>(
    () => ({
      category: (editing?.category as ExpenseCategory) ?? "food",
      limit: editing ? Number(money.fromUSD(editing.limit).toFixed(2)) : 0,
      period: (editing?.period as BudgetPeriod) ?? "monthly",
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
    const payload = { ...values, limit: money.toUSD(values.limit) };
    if (editing) {
      await updateBudget(editing.id, payload);
      toast.success("Budget updated");
    } else {
      await addBudget({ ...payload, userId });
      toast.success("Budget created");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>Control your expenses — the second law of Arkad.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              defaultValue={getValues("category")}
              onValueChange={(v) => setValue("category", v as ExpenseCategory)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Limit ({money.currency})</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("limit")} />
              {errors.limit && <p className="text-xs text-destructive">{errors.limit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                defaultValue={getValues("period")}
                onValueChange={(v) => setValue("period", v as BudgetPeriod)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
