"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { fuzzyMatchSubscription } from "@/utils/fuzzy-match";
import { cn } from "@/lib/utils";
import type { Expense, Subscription } from "@/types";

interface Props {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lightweight dialog to retroactively link existing expenses to a subscription.
 * Intentionally not a full management UI: the user picks the rows that belong
 * to this subscription, we patch each with `subscriptionId`, and we're done.
 *
 * The list is scored by the same fuzzy matcher Quick Add uses — expenses with
 * a description close to the subscription name surface first, flagged with a
 * "Suggested" badge so the user doesn't have to scroll looking for them.
 */
export function LinkExpensesDialog({ subscription, open, onOpenChange }: Props) {
  const expenses = useFinanceStore((s) => s.expenses);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const money = useMoney();
  const t = useTranslations("subscriptions.link");
  const tCommon = useTranslations("common");

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  // Reset selection each time the dialog opens — avoids stale ticks from a
  // previous pass on a different subscription.
  React.useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, subscription.id]);

  // Score + sort. Already-linked-to-THIS-sub expenses sit on top as ticked.
  // Expenses linked to other subs are hidden — changing that link belongs in
  // the expense form, not here.
  const rows = React.useMemo(() => {
    const candidates: Array<{ expense: Expense; suggested: boolean }> = [];
    for (const expense of expenses) {
      if (expense.subscriptionId && expense.subscriptionId !== subscription.id) continue;
      const fuzzy = fuzzyMatchSubscription(expense.description ?? "", [subscription]);
      // We want suggestions for anything at least "medium"; leave the rest as
      // plain rows so the user can still find them manually.
      const suggested = fuzzy.strength !== "none" && fuzzy.match?.id === subscription.id;
      candidates.push({ expense, suggested });
    }
    candidates.sort((a, b) => {
      // Already-linked first, then suggested, then by date desc.
      const aLinked = a.expense.subscriptionId === subscription.id ? 1 : 0;
      const bLinked = b.expense.subscriptionId === subscription.id ? 1 : 0;
      if (aLinked !== bLinked) return bLinked - aLinked;
      if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
      return a.expense.date < b.expense.date ? 1 : -1;
    });
    return candidates;
  }, [expenses, subscription]);

  // Pre-tick rows already linked so the user can also UNLINK from this view.
  // Only runs when the dialog opens or the data changes materially.
  React.useEffect(() => {
    if (!open) return;
    const initial = new Set<string>();
    for (const row of rows) {
      if (row.expense.subscriptionId === subscription.id) initial.add(row.expense.id);
    }
    setSelected(initial);
  }, [open, rows, subscription.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply() {
    setSubmitting(true);
    try {
      // Only write the expenses whose link actually changed — avoid wasted
      // Firestore writes when the user opens-and-confirms without touching.
      const mutations: Array<Promise<unknown>> = [];
      for (const row of rows) {
        const wasLinked = row.expense.subscriptionId === subscription.id;
        const nowLinked = selected.has(row.expense.id);
        if (wasLinked === nowLinked) continue;
        mutations.push(
          updateExpense(row.expense.id, {
            subscriptionId: nowLinked ? subscription.id : undefined,
          })
        );
      }
      if (mutations.length === 0) {
        onOpenChange(false);
        return;
      }
      await Promise.all(mutations);
      toast.success(
        t("linkApplied", { count: selected.size, name: subscription.name })
      );
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("linkTitle", { name: subscription.name })}</DialogTitle>
          <DialogDescription>{t("linkDescription")}</DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {t("linkEmpty")}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <ul className="divide-y">
              {rows.map(({ expense, suggested }) => {
                const checked = selected.has(expense.id);
                return (
                  <li
                    key={expense.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/40",
                      checked && "bg-primary/5"
                    )}
                    onClick={() => toggle(expense.id)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(expense.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {expense.description || <span className="text-muted-foreground">—</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(parseISO(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {suggested && (
                      <Badge variant="muted" className="gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" />
                        {t("detectedBadge", { name: subscription.name })}
                      </Badge>
                    )}
                    <span className="arka-number w-24 text-right text-sm text-muted-foreground">
                      {money.format(expense.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={apply} disabled={rows.length === 0 || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("linkApply", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
