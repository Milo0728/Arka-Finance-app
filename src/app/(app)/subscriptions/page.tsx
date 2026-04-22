"use client";

import * as React from "react";
import { Pencil, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubscriptionForm } from "@/features/subscription/subscription-form";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { useLabels } from "@/hooks/useLabels";
import {
  detectPotentialSubscriptions,
  monthlyEquivalent,
  totalMonthlySubscriptions,
} from "@/utils/finance";
import type { Subscription } from "@/types";

export default function SubscriptionsPage() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const expenses = useFinanceStore((s) => s.expenses);
  const removeSubscription = useFinanceStore((s) => s.removeSubscription);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const profile = useFinanceStore((s) => s.profile);
  const money = useMoney();
  const labels = useLabels();
  const t = useTranslations("subscriptions");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Subscription | null>(null);

  const monthlyTotal = totalMonthlySubscriptions(subscriptions);
  const yearlyTotal = monthlyTotal * 12;
  const candidates = detectPotentialSubscriptions(expenses).filter(
    (c) => !subscriptions.some((s) => s.name.toLowerCase() === (c.description ?? "").toLowerCase())
  );

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setOpen(true);
  }

  async function onDelete(sub: Subscription) {
    await removeSubscription(sub.id);
    toast.success(t("toasts.removed"));
  }

  async function addFromCandidate(description: string, amount: number) {
    await addSubscription({
      userId: profile?.id ?? "demo-user",
      name: description,
      amount,
      billingCycle: "monthly",
      category: "subscriptions",
    });
    toast.success(t("toasts.added"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("newSubscription")}</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label={t("active")}
          value={String(subscriptions.length)}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KPICard label={t("monthlyTotal")} value={money.format(monthlyTotal)} tone="warning" />
        <KPICard label={t("yearlyTotal")} value={money.format(yearlyTotal)} />
      </div>

      {candidates.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("candidatesTitle")}
            </CardTitle>
            <CardDescription>{t("candidatesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {candidates.slice(0, 8).map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                className="rounded-full border-dashed"
                onClick={() => addFromCandidate(c.description ?? t("recurringFallback"), c.amount)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="ml-1">
                  {c.description} · {money.format(c.amount)}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("newSubscription")}</span>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.service")}</TableHead>
                  <TableHead>{t("table.billing")}</TableHead>
                  <TableHead className="text-right">{t("table.amount")}</TableHead>
                  <TableHead className="text-right">{t("table.monthlyEquivalent")}</TableHead>
                  <TableHead className="w-24 text-right">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{labels.billing(s.billingCycle)}</Badge>
                    </TableCell>
                    <TableCell className="arka-number text-right">{money.format(s.amount)}</TableCell>
                    <TableCell className="arka-number text-right text-muted-foreground">
                      {money.format(monthlyEquivalent(s))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label={tCommon("edit")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(s)}
                          aria-label={tCommon("delete")}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SubscriptionForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
