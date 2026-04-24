"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FinancialInsight } from "@/types";

const SESSION_DISMISS_KEY = "arka-notifications-dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(SESSION_DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/**
 * In-app notifications surfaced from critical / warning insights. UI-only —
 * we deliberately don't ship push or email notifications during beta.
 *
 * Why session storage (not the achievements/zustand store): dismissals are
 * intentionally ephemeral. They reset next session so users see fresh alerts
 * after closing the tab; persisting them in localStorage would silently
 * suppress repeat critical issues.
 */
export function NotificationsBanner({ insights }: { insights: FinancialInsight[] }) {
  const t = useTranslations("notifications");
  const tRules = useTranslations("insights.rules");
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const visible = React.useMemo(
    () =>
      insights.filter(
        (i) => (i.level === "critical" || i.level === "warning") && !dismissed.has(i.id)
      ),
    [insights, dismissed]
  );

  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }

  return (
    <div className="space-y-2" data-tutorial="notifications">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("title")}
      </p>
      {visible.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3",
            insight.level === "critical"
              ? "border-destructive/40 bg-destructive/10"
              : "border-warning/40 bg-warning/10"
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              insight.level === "critical" ? "text-destructive" : "text-warning"
            )}
          />
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-medium">
              {tRules(insight.titleKey, insight.titleValues ?? {})}
            </p>
            <p className="text-xs text-muted-foreground">
              {tRules(insight.descriptionKey, insight.descriptionValues ?? {})}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => dismiss(insight.id)}
            aria-label={t("dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
