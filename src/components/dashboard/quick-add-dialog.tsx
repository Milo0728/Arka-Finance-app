"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { EXPENSE_CATEGORY_VALUES, INCOME_CATEGORY_VALUES } from "@/lib/categories";

type QuickAddProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickAddDialog({ open, onOpenChange }: QuickAddProps) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("quickAdd");

  const today = new Date().toISOString().slice(0, 10);

  const expenseSchema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(t("positive")),
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
    [t]
  );

  const incomeSchema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(t("positive")),
        category: z.enum(["salary", "freelance", "investment", "business", "gift", "other"]),
        date: z.string().min(1),
        description: z.string().optional(),
      }),
    [t]
  );

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: undefined, category: "food", type: "variable", date: today, description: "" },
  });

  const incomeForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { amount: undefined, category: "salary", date: today, description: "" },
  });

  async function submitExpense(values: z.infer<typeof expenseSchema>) {
    await addExpense({ ...values, amount: money.toUSD(values.amount), userId });
    toast.success(t("toasts.expenseAdded"));
    onOpenChange(false);
    expenseForm.reset({ ...values, amount: undefined, description: "" });
  }

  async function submitIncome(values: z.infer<typeof incomeSchema>) {
    await addIncome({ ...values, amount: money.toUSD(values.amount), userId });
    toast.success(t("toasts.incomeAdded"));
    onOpenChange(false);
    incomeForm.reset({ ...values, amount: undefined, description: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="expense">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">{t("expenseTab")}</TabsTrigger>
            <TabsTrigger value="income">{t("incomeTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="expense">
            <form onSubmit={expenseForm.handleSubmit(submitExpense)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t("amount")} ({money.currency})
                  </Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...expenseForm.register("amount")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("date")}</Label>
                  <Input type="date" {...expenseForm.register("date")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select
                    defaultValue={expenseForm.getValues("category")}
                    onValueChange={(v) =>
                      expenseForm.setValue("category", v as z.infer<typeof expenseSchema>["category"])
                    }
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
                  <Label>{t("type")}</Label>
                  <Select
                    defaultValue={expenseForm.getValues("type")}
                    onValueChange={(v) => expenseForm.setValue("type", v as "fixed" | "variable")}
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
                <Label>{t("description")}</Label>
                <Input placeholder={t("expensePlaceholder")} {...expenseForm.register("description")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={expenseForm.formState.isSubmitting}>
                  {expenseForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("saveExpense")}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="income">
            <form onSubmit={incomeForm.handleSubmit(submitIncome)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t("amount")} ({money.currency})
                  </Label>
                  <Input type="number" step="0.01" placeholder="0.00" {...incomeForm.register("amount")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("date")}</Label>
                  <Input type="date" {...incomeForm.register("date")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select
                  defaultValue={incomeForm.getValues("category")}
                  onValueChange={(v) =>
                    incomeForm.setValue("category", v as z.infer<typeof incomeSchema>["category"])
                  }
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
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Input placeholder={t("incomePlaceholder")} {...incomeForm.register("description")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={incomeForm.formState.isSubmitting}>
                  {incomeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("saveIncome")}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
