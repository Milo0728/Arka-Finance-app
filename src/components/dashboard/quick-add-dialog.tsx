"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import { EXPENSE_CATEGORY_VALUES, INCOME_CATEGORY_VALUES } from "@/lib/categories";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { parseQuickAddBatch } from "@/lib/quick-add-parser";
import { fuzzyMatchSubscription } from "@/utils/fuzzy-match";
import type { ExpenseCategory, IncomeCategory, Subscription } from "@/types";

type QuickAddProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NO_ACCOUNT_VALUE = "__none__";
const LAST_ACCOUNT_KEY = "arka-quick-add-last-account";

function readLastAccount(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function writeLastAccount(value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(LAST_ACCOUNT_KEY, value);
    else window.localStorage.removeItem(LAST_ACCOUNT_KEY);
  } catch {
    /* ignore — quota errors must not block submission */
  }
}

interface DraftExpense {
  amount: number;
  description: string;
  category: ExpenseCategory;
}

interface DraftIncome {
  amount: number;
  description: string;
  category: IncomeCategory;
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddProps) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const profile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("quickAdd");
  const tAccounts = useTranslations("accounts");
  const tSubs = useTranslations("subscriptions");
  const proEnabled = isFeatureEnabled("quickAddPro");
  // Always show the selector once the user has real accounts — otherwise
  // entries would silently default to "General" and never link to the real
  // account, which is the exact bug we're fixing.
  const accountSelectorVisible = isFeatureEnabled("multiAccount") && accounts.length >= 1;

  /**
   * Exact lookup kept for the strong/auto path. The fuzzy matcher handles
   * typos and fragments separately — we use the exact map first as a fast
   * pre-check before running the distance-based pass.
   */
  const subsByName = React.useMemo(() => {
    const map = new Map<string, Subscription>();
    for (const s of subscriptions) map.set(s.name.trim().toLowerCase(), s);
    return map;
  }, [subscriptions]);

  /**
   * Best-effort subscription match for a description. Returns strong/medium/none
   * so callers can decide whether to auto-assign or just suggest.
   */
  function resolveSubscriptionFor(description: string) {
    const trimmed = description.trim();
    if (!trimmed) return { match: null, strength: "none" as const };
    // Fast path — exact lowercase match is always strong.
    const exact = subsByName.get(trimmed.toLowerCase());
    if (exact) return { match: exact, strength: "strong" as const };
    const fuzzy = fuzzyMatchSubscription(trimmed, subscriptions);
    return { match: fuzzy.match, strength: fuzzy.strength };
  }

  const today = new Date().toISOString().slice(0, 10);
  // Quick Add default cascade — never silently lands on "General" when the
  // user has real accounts. Priority: active filter → last used → first owned.
  const defaultAccountId =
    activeAccountId ?? readLastAccount() ?? accounts[0]?.id ?? undefined;

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
          "transfer",
        ]),
        type: z.enum(["fixed", "variable"]),
        date: z.string().min(1),
        description: z.string().optional(),
        accountId: z.string().optional(),
      }),
    [t]
  );

  const incomeSchema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(t("positive")),
        category: z.enum(["salary", "freelance", "investment", "business", "gift", "other", "transfer"]),
        date: z.string().min(1),
        description: z.string().optional(),
        accountId: z.string().optional(),
      }),
    [t]
  );

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: undefined,
      category: "food",
      type: "variable",
      date: today,
      description: "",
      accountId: defaultAccountId,
    },
  });

  const incomeForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: undefined,
      category: "salary",
      date: today,
      description: "",
      accountId: defaultAccountId,
    },
  });

  // Batch parse box — separate piece of state because it doesn't fit RHF's model
  // and needs to be transient (cleared after every submit).
  const [parseInput, setParseInput] = React.useState("");
  const [expenseDrafts, setExpenseDrafts] = React.useState<DraftExpense[]>([]);
  const [incomeDrafts, setIncomeDrafts] = React.useState<DraftIncome[]>([]);
  const [submittingBatch, setSubmittingBatch] = React.useState(false);

  // Simple mode collapses the form to amount + description + save. The user's
  // choice is remembered in localStorage so experienced users stay on
  // advanced while first-timers get the lean form.
  const MODE_KEY = "arka-quick-add-mode";
  const [simpleMode, setSimpleMode] = React.useState<boolean>(true);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MODE_KEY);
      if (stored === "advanced") setSimpleMode(false);
    } catch {
      /* ignore */
    }
  }, []);
  function toggleMode() {
    setSimpleMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(MODE_KEY, next ? "simple" : "advanced");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Live subscription suggestion while the user types the description —
  // only when category is "subscriptions" so it doesn't spam every category.
  const watchedDescription = expenseForm.watch("description") ?? "";
  const watchedCategory = expenseForm.watch("category");
  const subHint = React.useMemo(() => {
    if (watchedCategory !== "subscriptions") return null;
    if (!watchedDescription.trim()) return null;
    return resolveSubscriptionFor(watchedDescription);
    // Disabling exhaustive deps: `resolveSubscriptionFor` depends on stable
    // references (subsByName and subscriptions) already captured through closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCategory, watchedDescription, subscriptions]);

  function applyExpenseParse() {
    const parsed = parseQuickAddBatch(parseInput);
    const valid = parsed.filter((p) => p.amount !== null && Number.isFinite(p.amount));
    if (valid.length === 0) {
      // Even when nothing parses, clear the hint area instead of failing silently.
      setExpenseDrafts([]);
      toast.error(t("parser.noAmount"));
      return;
    }
    if (valid.length === 1) {
      // Single transaction: behave exactly like before — fill the form, no preview list.
      const [single] = valid;
      if (single.amount !== null) expenseForm.setValue("amount", single.amount);
      if (single.description) expenseForm.setValue("description", single.description);
      if (single.category) expenseForm.setValue("category", single.category);
      // Subscription detection: ONLY strong matches auto-flip the category
      // and show a confirmation toast. Medium matches surface as a suggestion
      // toast with an explicit "Use" action — the user decides. Nothing is
      // ever changed in the background on a medium match.
      const resolved = resolveSubscriptionFor(single.description);
      if (resolved.strength === "strong" && resolved.match) {
        expenseForm.setValue("category", "subscriptions");
        toast.message(tSubs("link.detectedToast", { name: resolved.match.name }));
      } else if (resolved.strength === "medium" && resolved.match) {
        const match = resolved.match;
        toast.message(tSubs("link.suggest", { name: match.name }), {
          action: {
            label: tSubs("link.useThis"),
            // Accepting canonicalises the description AND sets the category,
            // so the next re-check is a strong match and submit auto-links.
            onClick: () => {
              expenseForm.setValue("category", "subscriptions");
              expenseForm.setValue("description", match.name);
            },
          },
        });
      }
      setExpenseDrafts([]);
      return;
    }
    // Multi-transaction preview. Default category fallback keeps the row submittable.
    setExpenseDrafts(
      valid.map((p) => ({
        amount: p.amount as number,
        description: p.description,
        category: (p.category ?? "other") as ExpenseCategory,
      }))
    );
  }

  function applyIncomeParse() {
    const parsed = parseQuickAddBatch(parseInput);
    const valid = parsed.filter((p) => p.amount !== null && Number.isFinite(p.amount));
    if (valid.length === 0) {
      setIncomeDrafts([]);
      toast.error(t("parser.noAmount"));
      return;
    }
    if (valid.length === 1) {
      const [single] = valid;
      if (single.amount !== null) incomeForm.setValue("amount", single.amount);
      if (single.description) incomeForm.setValue("description", single.description);
      if (single.incomeCategory) incomeForm.setValue("category", single.incomeCategory);
      setIncomeDrafts([]);
      return;
    }
    setIncomeDrafts(
      valid.map((p) => ({
        amount: p.amount as number,
        description: p.description,
        category: (p.incomeCategory ?? "other") as IncomeCategory,
      }))
    );
  }

  function resolveAccountId(raw?: string): string | undefined {
    return raw && raw !== NO_ACCOUNT_VALUE ? raw : undefined;
  }

  async function submitExpense(values: z.infer<typeof expenseSchema>) {
    const accountId = resolveAccountId(values.accountId);
    // Subscription linking on submit — strict, explicit, never surprising:
    //  - strong match          → link to the existing subscription.
    //  - medium / no match     → save the expense WITHOUT a subscriptionId.
    //                            The inline band already offered actions
    //                            ("Use this" / "Create") and the user chose
    //                            not to use them. No background creation.
    let subscriptionId: string | undefined;
    if (values.category === "subscriptions") {
      const desc = (values.description ?? "").trim();
      if (desc) {
        const resolved = resolveSubscriptionFor(desc);
        if (resolved.strength === "strong" && resolved.match) {
          subscriptionId = resolved.match.id;
        }
      }
    }
    await addExpense({
      ...values,
      amount: money.toUSD(values.amount),
      userId,
      accountId,
      subscriptionId,
    });
    if (accountId) writeLastAccount(accountId);
    toast.success(t("toasts.expenseAdded"));
    onOpenChange(false);
    expenseForm.reset({ ...values, amount: undefined, description: "" });
    setParseInput("");
  }

  async function submitIncome(values: z.infer<typeof incomeSchema>) {
    const accountId = resolveAccountId(values.accountId);
    await addIncome({ ...values, amount: money.toUSD(values.amount), userId, accountId });
    if (accountId) writeLastAccount(accountId);
    toast.success(t("toasts.incomeAdded"));
    onOpenChange(false);
    incomeForm.reset({ ...values, amount: undefined, description: "" });
    setParseInput("");
  }

  async function submitExpenseBatch() {
    if (expenseDrafts.length === 0) return;
    const values = expenseForm.getValues();
    const accountId = resolveAccountId(values.accountId);
    setSubmittingBatch(true);
    try {
      // Sequential keeps the visible insertion order stable in the store.
      for (const draft of expenseDrafts) {
        // In batch we only LINK to existing subscriptions — never auto-create.
        // Creating N subscriptions silently from a paste would be too magical.
        // Strong matches only: medium/fuzzy should require user confirmation,
        // which isn't possible in a non-interactive bulk flow.
        const resolved =
          draft.category === "subscriptions"
            ? resolveSubscriptionFor(draft.description)
            : { match: null, strength: "none" as const };
        const subscriptionId =
          resolved.strength === "strong" ? resolved.match?.id : undefined;
        await addExpense({
          userId,
          amount: money.toUSD(draft.amount),
          category: draft.category,
          type: values.type,
          date: values.date,
          description: draft.description,
          accountId,
          subscriptionId,
        });
      }
      if (accountId) writeLastAccount(accountId);
      toast.success(t("toasts.batchAdded", { count: expenseDrafts.length }));
      setExpenseDrafts([]);
      setParseInput("");
      onOpenChange(false);
    } finally {
      setSubmittingBatch(false);
    }
  }

  async function submitIncomeBatch() {
    if (incomeDrafts.length === 0) return;
    const values = incomeForm.getValues();
    const accountId = resolveAccountId(values.accountId);
    setSubmittingBatch(true);
    try {
      for (const draft of incomeDrafts) {
        await addIncome({
          userId,
          amount: money.toUSD(draft.amount),
          category: draft.category,
          date: values.date,
          description: draft.description,
          accountId,
        });
      }
      if (accountId) writeLastAccount(accountId);
      toast.success(t("toasts.batchAdded", { count: incomeDrafts.length }));
      setIncomeDrafts([]);
      setParseInput("");
      onOpenChange(false);
    } finally {
      setSubmittingBatch(false);
    }
  }

  function removeExpenseDraft(idx: number) {
    setExpenseDrafts((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeIncomeDraft(idx: number) {
    setIncomeDrafts((prev) => prev.filter((_, i) => i !== idx));
  }

  // Per-row category editors for the batch preview. Keeping these inline in
  // the render file would triple the already-long JSX, so we hoist them.
  function setExpenseDraftCategory(idx: number, next: ExpenseCategory) {
    setExpenseDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, category: next } : d))
    );
  }

  function setIncomeDraftCategory(idx: number, next: IncomeCategory) {
    setIncomeDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, category: next } : d))
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </div>
            {/* Mode toggle — small, discoverable, persisted. Placing it in
                the header keeps it findable without adding visual weight. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={toggleMode}
            >
              {simpleMode ? t("modeToAdvanced") : t("modeToSimple")}
            </Button>
          </div>
        </DialogHeader>
        <Tabs defaultValue="expense">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">{t("expenseTab")}</TabsTrigger>
            <TabsTrigger value="income">{t("incomeTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="expense">
            {proEnabled && !simpleMode && (
              <div className="mb-3 space-y-2 rounded-lg border bg-muted/40 p-3">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> {t("parser.label")}
                </Label>
                <p className="text-[11px] text-muted-foreground">{t("parser.batchHint")}</p>
                <div className="flex gap-2">
                  <Textarea
                    value={parseInput}
                    onChange={(e) => setParseInput(e.target.value)}
                    placeholder={t("parser.batchPlaceholder")}
                    rows={2}
                    onKeyDown={(e) => {
                      // Cmd/Ctrl+Enter parses; bare Enter still inserts a newline so users
                      // can type multiple entries naturally.
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        applyExpenseParse();
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={applyExpenseParse}>
                    {t("parser.apply")}
                  </Button>
                </div>
              </div>
            )}

            {expenseDrafts.length > 0 && (
              <div className="mb-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {t("preview.title", { count: expenseDrafts.length })}
                </p>
                <ul className="space-y-1.5">
                  {expenseDrafts.map((draft, idx) => (
                    <li
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-sm"
                    >
                      {/* Inline category editor — lets the user correct a bad
                          parser guess without having to remove the row. */}
                      <Select
                        value={draft.category}
                        onValueChange={(v) => setExpenseDraftCategory(idx, v as ExpenseCategory)}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[110px] text-[11px]">
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
                      <span className="flex-1 truncate">
                        {draft.description || t("preview.noDescription")}
                      </span>
                      <span className="arka-number text-sm font-medium">
                        {money.format(money.toUSD(draft.amount))}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExpenseDraft(idx)}
                        aria-label={t("preview.remove")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground">{t("preview.hintExpense")}</p>
              </div>
            )}

            <form onSubmit={expenseForm.handleSubmit(submitExpense)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t("amount")} ({money.currency})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={expenseDrafts.length > 0}
                    {...expenseForm.register("amount")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("date")}</Label>
                  <Input type="date" {...expenseForm.register("date")} />
                </div>
              </div>
              {!simpleMode && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("category")}</Label>
                    <Select
                      value={expenseForm.watch("category")}
                      onValueChange={(v) =>
                        expenseForm.setValue("category", v as z.infer<typeof expenseSchema>["category"])
                      }
                      disabled={expenseDrafts.length > 0}
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
              )}
              {!simpleMode && accountSelectorVisible && (
                <div className="space-y-2">
                  <Label>{tAccounts("form.accountLabel")}</Label>
                  <Select
                    value={expenseForm.watch("accountId") ?? NO_ACCOUNT_VALUE}
                    onValueChange={(v) =>
                      expenseForm.setValue("accountId", v === NO_ACCOUNT_VALUE ? undefined : v, {
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
                <Label>{t("description")}</Label>
                <Input
                  placeholder={t("expensePlaceholder")}
                  disabled={expenseDrafts.length > 0}
                  {...expenseForm.register("description")}
                />
                {/* Subscription hint band — reacts to description typing.
                    Strong: green badge; linking happens on submit.
                    Medium: suggest with explicit "Use" button.
                    None with non-empty desc: explicit "Create" button — never
                    implicit, to avoid netflx/netflix/netflix-premium duplicates. */}
                {subHint && watchedDescription.trim() && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {subHint.strength === "strong" && subHint.match && (
                      <Badge variant="success" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {tSubs("link.detectedBadge", { name: subHint.match.name })}
                      </Badge>
                    )}
                    {subHint.strength === "medium" && subHint.match && (
                      <>
                        <span className="text-muted-foreground">
                          {tSubs("link.suggest", { name: subHint.match.name })}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            // Accepting swaps the description to the canonical
                            // name so the strong-match path takes over and the
                            // link is locked in on submit.
                            expenseForm.setValue("description", subHint.match!.name);
                          }}
                        >
                          {tSubs("link.useThis")}
                        </Button>
                      </>
                    )}
                    {subHint.strength === "none" && (
                      <>
                        <span className="text-muted-foreground">
                          {tSubs("link.notFoundPrompt", { name: watchedDescription.trim() })}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={async () => {
                            const name = watchedDescription.trim();
                            if (!name) return;
                            const rawAmount = Number(expenseForm.getValues("amount")) || 0;
                            await addSubscription({
                              userId,
                              name,
                              amount: rawAmount > 0 ? money.toUSD(rawAmount) : 0,
                              billingCycle: "monthly",
                              category: "subscriptions",
                            });
                            toast.message(tSubs("link.createdToast", { name }));
                            // Re-render picks up the new subscription so the
                            // next resolveSubscriptionFor returns "strong" and
                            // submit auto-links.
                          }}
                        >
                          {tSubs("link.createBtn", { name: watchedDescription.trim() })}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                {expenseDrafts.length > 0 ? (
                  <Button type="button" onClick={submitExpenseBatch} disabled={submittingBatch}>
                    {submittingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("preview.saveBatch", { count: expenseDrafts.length })}
                  </Button>
                ) : (
                  <Button type="submit" disabled={expenseForm.formState.isSubmitting}>
                    {expenseForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("saveExpense")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="income">
            {proEnabled && !simpleMode && (
              <div className="mb-3 space-y-2 rounded-lg border bg-muted/40 p-3">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> {t("parser.label")}
                </Label>
                <p className="text-[11px] text-muted-foreground">{t("parser.batchHint")}</p>
                <div className="flex gap-2">
                  <Textarea
                    value={parseInput}
                    onChange={(e) => setParseInput(e.target.value)}
                    placeholder={t("parser.batchPlaceholderIncome")}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        applyIncomeParse();
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={applyIncomeParse}>
                    {t("parser.apply")}
                  </Button>
                </div>
              </div>
            )}

            {incomeDrafts.length > 0 && (
              <div className="mb-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {t("preview.title", { count: incomeDrafts.length })}
                </p>
                <ul className="space-y-1.5">
                  {incomeDrafts.map((draft, idx) => (
                    <li
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-sm"
                    >
                      <Select
                        value={draft.category}
                        onValueChange={(v) => setIncomeDraftCategory(idx, v as IncomeCategory)}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[110px] text-[11px]">
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
                      <span className="flex-1 truncate">
                        {draft.description || t("preview.noDescription")}
                      </span>
                      <span className="arka-number text-sm font-medium text-success">
                        +{money.format(money.toUSD(draft.amount))}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeIncomeDraft(idx)}
                        aria-label={t("preview.remove")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground">{t("preview.hintIncome")}</p>
              </div>
            )}

            <form onSubmit={incomeForm.handleSubmit(submitIncome)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t("amount")} ({money.currency})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={incomeDrafts.length > 0}
                    {...incomeForm.register("amount")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("date")}</Label>
                  <Input type="date" {...incomeForm.register("date")} />
                </div>
              </div>
              {!simpleMode && (
                <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select
                    value={incomeForm.watch("category")}
                    onValueChange={(v) =>
                      incomeForm.setValue("category", v as z.infer<typeof incomeSchema>["category"])
                    }
                    disabled={incomeDrafts.length > 0}
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
              )}
              {!simpleMode && accountSelectorVisible && (
                <div className="space-y-2">
                  <Label>{tAccounts("form.accountLabel")}</Label>
                  <Select
                    value={incomeForm.watch("accountId") ?? NO_ACCOUNT_VALUE}
                    onValueChange={(v) =>
                      incomeForm.setValue("accountId", v === NO_ACCOUNT_VALUE ? undefined : v, {
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
                <Label>{t("description")}</Label>
                <Input
                  placeholder={t("incomePlaceholder")}
                  disabled={incomeDrafts.length > 0}
                  {...incomeForm.register("description")}
                />
              </div>
              <DialogFooter>
                {incomeDrafts.length > 0 ? (
                  <Button type="button" onClick={submitIncomeBatch} disabled={submittingBatch}>
                    {submittingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("preview.saveBatch", { count: incomeDrafts.length })}
                  </Button>
                ) : (
                  <Button type="submit" disabled={incomeForm.formState.isSubmitting}>
                    {incomeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("saveIncome")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
