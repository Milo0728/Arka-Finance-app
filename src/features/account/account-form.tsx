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
import { CURRENCIES } from "@/lib/currency";
import { FALLBACK_RATES } from "@/lib/exchange";
import type { Account, AccountType, Currency } from "@/types";

type Values = {
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  color?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Account | null;
}

export function AccountForm({ open, onOpenChange, editing }: Props) {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const setActiveAccountId = useFinanceStore((s) => s.setActiveAccountId);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const rates = useFinanceStore((s) => s.rates);
  const t = useTranslations("accounts");
  const tForm = useTranslations("accounts.form");
  const tCommon = useTranslations("common");

  // Per-account FX: the *initial balance* is entered in the account's own
  // currency (not the user's global display currency), so we convert with the
  // rate for that currency. Falls back to the static table if a live rate is
  // missing, and to 1 (USD) as last resort to never throw on submit.
  const rateFor = React.useCallback(
    (code: Currency) => {
      const live = rates[code];
      if (typeof live === "number" && live > 0) return live;
      const fb = FALLBACK_RATES[code];
      return fb && fb > 0 ? fb : 1;
    },
    [rates]
  );

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(1, tForm("nameRequired")),
        type: z.enum(["bank", "cash", "wallet"]),
        currency: z.string().min(1) as z.ZodType<Currency>,
        initialBalance: z.coerce.number().min(0, tForm("nonNegative")),
        color: z.string().optional(),
      }),
    [tForm]
  );

  const defaults = React.useMemo<Values>(() => {
    const accountCurrency: Currency = editing?.currency ?? money.currency;
    const accountRate = rateFor(accountCurrency);
    return {
      name: editing?.name ?? "",
      type: editing?.type ?? "bank",
      currency: accountCurrency,
      // When editing: stored amount is USD; show it converted to the
      // account's own currency. When creating: blank field.
      initialBalance: editing
        ? Number((editing.initialBalance * accountRate).toFixed(2))
        : 0,
      color: editing?.color ?? "",
    };
  }, [editing, money.currency, rateFor]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  // The currency the user just picked in the form drives the input label and
  // the USD conversion on submit — not the global display currency.
  const watchedCurrency = watch("currency") ?? money.currency;

  async function onSubmit(values: Values) {
    const accountRate = rateFor(values.currency);
    const payload = {
      ...values,
      // Convert from the account's currency to USD for storage.
      // Was previously using money.toUSD (global display rate) which silently
      // mis-stored the balance whenever the account currency != display.
      initialBalance: values.initialBalance / accountRate,
    };
    if (editing) {
      await updateAccount(editing.id, payload);
      toast.success(t("toasts.updated"));
    } else {
      const created = await addAccount({ ...payload, userId });
      // Auto-focus on the new account so the next quick add lands there.
      setActiveAccountId(created.id);
      toast.success(t("toasts.created"));
      toast.message(t("activatedToast", { name: created.name }));
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
            <Label>{tForm("name")}</Label>
            <Input placeholder={tForm("namePlaceholder")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tForm("type")}</Label>
              <Select
                defaultValue={getValues("type")}
                onValueChange={(v) => setValue("type", v as AccountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">{tForm("typeBank")}</SelectItem>
                  <SelectItem value="cash">{tForm("typeCash")}</SelectItem>
                  <SelectItem value="wallet">{tForm("typeWallet")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tForm("currency")}</Label>
              <Select
                defaultValue={getValues("currency")}
                onValueChange={(v) => setValue("currency", v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} · {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              {tForm("initialBalance")} ({watchedCurrency})
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("initialBalance")}
            />
            {errors.initialBalance && (
              <p className="text-xs text-destructive">{errors.initialBalance.message}</p>
            )}
            {watchedCurrency !== money.baseCurrency && (
              <p className="text-[11px] text-muted-foreground">
                {tForm("storedIn", {
                  base: money.baseCurrency,
                  rate: rateFor(watchedCurrency).toFixed(4),
                  currency: watchedCurrency,
                })}
              </p>
            )}
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
