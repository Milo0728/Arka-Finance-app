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

const schema = z.object({
  title: z.string().min(2, "Give your goal a name"),
  targetAmount: z.coerce.number().positive("Must be positive"),
  currentAmount: z.coerce.number().min(0, "Cannot be negative"),
  deadline: z.string().min(1, "Pick a deadline"),
});

type Values = z.infer<typeof schema>;

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

  const defaults = React.useMemo<Values>(
    () => ({
      title: editing?.title ?? "",
      targetAmount: editing ? Number(money.fromUSD(editing.targetAmount).toFixed(2)) : 0,
      currentAmount: editing ? Number(money.fromUSD(editing.currentAmount).toFixed(2)) : 0,
      deadline:
        editing?.deadline ?? new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().slice(0, 10),
    }),
    [editing, money]
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
      toast.success("Goal updated");
    } else {
      await addGoal({ ...payload, userId });
      toast.success("Goal created");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>Dream big — then break it down into a monthly plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Emergency fund, Japan trip, Down payment…" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target amount ({money.currency})</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("targetAmount")} />
              {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Saved so far ({money.currency})</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("currentAmount")} />
              {errors.currentAmount && <p className="text-xs text-destructive">{errors.currentAmount.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="date" {...register("deadline")} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
