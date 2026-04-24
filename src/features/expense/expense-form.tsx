"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Repeat } from "lucide-react";
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
import { isFeatureEnabled } from "@/lib/feature-flags";
import { QuickParseInput } from "@/components/dashboard/quick-parse-input";
import type { Expense, ExpenseCategory, ExpenseType } from "@/types";

const NO_ACCOUNT_VALUE = "__none__";
const NO_SUB_VALUE = "__none__";
const CREATE_SUB_VALUE = "__create__";

type Values = {
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  description?: string;
  accountId?: string;
  /** Existing subscription id, the create sentinel, or NO_SUB_VALUE. */
  subscriptionPick?: string;
  /** Used only when `subscriptionPick === CREATE_SUB_VALUE`. */
  newSubscriptionName?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editing }: Props) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const profile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("expenses");
  const tForm = useTranslations("expenses.form");
  const tCommon = useTranslations("common");
  const tAccounts = useTranslations("accounts");
  const tSubs = useTranslations("subscriptions");
  // Show the picker whenever there's at least one account to pick — otherwise
  // the user has no way to tie an entry to their real account and everything
  // silently lands in "General". The previous ≥2 rule caused exactly that bug.
  const showAccountSelector = isFeatureEnabled("multiAccount") && accounts.length >= 1;

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
          "transfer",
        ]),
        type: z.enum(["fixed", "variable"]),
        date: z.string().min(1),
        description: z.string().optional(),
        accountId: z.string().optional(),
        subscriptionPick: z.string().optional(),
        newSubscriptionName: z.string().optional(),
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
      // Default cascade: the entry's own account (when editing) →
      // the globally active account → the first real account the user owns.
      // Only falls back to undefined ("General") when the user has no
      // accounts at all. Prevents the previous silent-to-General bug.
      accountId:
        editing?.accountId ??
        activeAccountId ??
        (accounts[0]?.id) ??
        undefined,
      subscriptionPick: editing?.subscriptionId ?? NO_SUB_VALUE,
      newSubscriptionName: "",
    }),
    [editing, moneyRate, activeAccountId]
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

  const watchedCategory = watch("category");
  const watchedSub = watch("subscriptionPick");
  const showSubscriptionField = watchedCategory === "subscriptions";
  const showNewSubInput = showSubscriptionField && watchedSub === CREATE_SUB_VALUE;

  async function onSubmit(values: Values) {
    // Strip out the synthetic "no account" sentinel so we never persist it to Firestore.
    const accountId =
      values.accountId && values.accountId !== NO_ACCOUNT_VALUE ? values.accountId : undefined;

    // Resolve subscription link. We only persist a `subscriptionId` when the
    // expense really is in the subscriptions category — otherwise users who
    // change category late would carry a stale link.
    let subscriptionId: string | undefined;
    if (values.category === "subscriptions") {
      if (values.subscriptionPick === CREATE_SUB_VALUE) {
        const name = (values.newSubscriptionName ?? "").trim();
        if (!name) {
          toast.error(tSubs("link.needName"));
          return;
        }
        // Create the subscription first so the id we link is real, not a temp.
        const created = await addSubscription({
          userId,
          name,
          // Use the expense amount in USD as a starting point for the
          // declared monthly amount — the user can refine it later.
          amount: money.toUSD(values.amount),
          billingCycle: "monthly",
          category: "subscriptions",
        });
        subscriptionId = created.id;
        toast.success(tSubs("link.createdToast", { name }));
      } else if (values.subscriptionPick && values.subscriptionPick !== NO_SUB_VALUE) {
        subscriptionId = values.subscriptionPick;
      }
    }

    const payload = {
      ...values,
      amount: money.toUSD(values.amount),
      accountId,
      subscriptionId,
    };
    // Strip transient form-only fields before persisting.
    delete (payload as Record<string, unknown>).subscriptionPick;
    delete (payload as Record<string, unknown>).newSubscriptionName;

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
          {!editing && (
            <QuickParseInput
              onApply={(result) => {
                if (result.amount !== null) setValue("amount", result.amount);
                if (result.description) setValue("description", result.description);
                if (result.category) setValue("category", result.category);
              }}
              resolveLabel={(r) => (r.category ? labels.expenseCategory(r.category) ?? r.category : null)}
            />
          )}
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
                value={watchedCategory}
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

          {/* Subscription link — appears only when the user picks the
              "subscriptions" category. Lets the expense be tied to an
              existing subscription or spawn a new one inline. */}
          {showSubscriptionField && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Label className="flex items-center gap-1.5 text-xs">
                <Repeat className="h-3 w-3 text-primary" />
                {tSubs("link.label")}
              </Label>
              <Select
                value={watchedSub ?? NO_SUB_VALUE}
                onValueChange={(v) => setValue("subscriptionPick", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUB_VALUE}>{tSubs("link.none")}</SelectItem>
                  {subscriptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CREATE_SUB_VALUE}>{tSubs("link.createNew")}</SelectItem>
                </SelectContent>
              </Select>
              {showNewSubInput && (
                <div className="space-y-1">
                  <Input
                    placeholder={tSubs("link.namePlaceholder")}
                    {...register("newSubscriptionName")}
                  />
                  <p className="text-[11px] text-muted-foreground">{tSubs("link.createHint")}</p>
                </div>
              )}
            </div>
          )}

          {showAccountSelector && (
            <div className="space-y-2">
              <Label>{tAccounts("form.accountLabel")}</Label>
              <Select
                // Controlled value — `watch()` keeps the Select in sync with
                // form state, so when accounts load asynchronously or the
                // defaults re-compute, the dropdown reflects the change.
                value={watch("accountId") ?? NO_ACCOUNT_VALUE}
                onValueChange={(v) =>
                  setValue("accountId", v === NO_ACCOUNT_VALUE ? undefined : v, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT_VALUE}>{tAccounts("form.noAccount")}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
