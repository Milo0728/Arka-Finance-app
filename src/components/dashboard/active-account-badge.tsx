"use client";

import { Landmark, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/useFinanceStore";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DEFAULT_BUCKET_ID } from "@/utils/accounts";

/**
 * Persistent pill in the app header that makes the active account filter
 * unmissable. When filter is off (null), renders nothing so the header stays
 * tidy. Clicking the X clears the filter store-wide — every page that reads
 * `activeAccountId` reacts automatically.
 *
 * This is the single source of truth for "am I filtering right now?" across
 * Dashboard, Income, Expenses, Reports, Insights and Budgets.
 */
export function ActiveAccountBadge() {
  const activeAccountId = useFinanceStore((s) => s.activeAccountId);
  const accounts = useFinanceStore((s) => s.accounts);
  const setActive = useFinanceStore((s) => s.setActiveAccountId);
  const t = useTranslations("accounts");

  if (!isFeatureEnabled("multiAccount")) return null;
  if (!activeAccountId) return null;

  const label =
    activeAccountId === DEFAULT_BUCKET_ID
      ? t("filterUnassigned")
      : accounts.find((a) => a.id === activeAccountId)?.name ?? "—";

  return (
    // Visible on every breakpoint — a filter silently active on mobile is the
    // most confusing state the UI can be in. The label truncates aggressively
    // on small screens to keep the header compact.
    <div className="inline-flex min-w-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-0.5 text-xs font-medium text-primary">
      <Landmark className="h-3 w-3 shrink-0" />
      <span className="max-w-[80px] truncate sm:max-w-[140px]">{label}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full hover:bg-primary/20"
        onClick={() => setActive(null)}
        aria-label={t("clearFilter")}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
