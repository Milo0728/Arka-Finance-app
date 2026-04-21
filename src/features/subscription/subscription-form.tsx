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
import type { BillingCycle, Subscription } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Give it a name"),
  amount: z.coerce.number().positive("Must be positive"),
  billingCycle: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
});

type Values = z.infer<typeof schema>;

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

  const defaults = React.useMemo<Values>(
    () => ({
      name: editing?.name ?? "",
      amount: editing ? Number(money.fromUSD(editing.amount).toFixed(2)) : 0,
      billingCycle: (editing?.billingCycle as BillingCycle) ?? "monthly",
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
      await updateSubscription(editing.id, payload);
      toast.success("Subscription updated");
    } else {
      await addSubscription({ ...payload, userId, category: "subscriptions" });
      toast.success("Subscription added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subscription" : "New subscription"}</DialogTitle>
          <DialogDescription>Keep tabs on every recurring charge.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Netflix, Spotify, Gym…" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount ({money.currency})</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                defaultValue={getValues("billingCycle")}
                onValueChange={(v) => setValue("billingCycle", v as BillingCycle)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
