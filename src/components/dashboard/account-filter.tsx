"use client";

import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DEFAULT_BUCKET_ID } from "@/utils/accounts";

const ALL_ACCOUNTS = "__all__";

interface AccountFilterProps {
  /** Optional override — if not passed, the component reads `activeAccountId`
   *  from the store and writes back via `setActiveAccountId`. */
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** Hide the filter when there are no accounts at all. Defaults to true. */
  hideWhenEmpty?: boolean;
  className?: string;
}

/**
 * Reusable account filter dropdown. Used by income / expenses / dashboard.
 * Falls back to the store's `activeAccountId` so different surfaces stay in sync.
 */
export function AccountFilter({
  value,
  onChange,
  hideWhenEmpty = true,
  className,
}: AccountFilterProps) {
  const accounts = useFinanceStore((s) => s.accounts);
  const storeValue = useFinanceStore((s) => s.activeAccountId);
  const setActive = useFinanceStore((s) => s.setActiveAccountId);
  const t = useTranslations("accounts");

  if (!isFeatureEnabled("multiAccount")) return null;
  // The "General" bucket (entries without accountId) always counts as an
  // implicit account. So a user with 1 real account already has 2 effective
  // buckets to choose between — hide the filter ONLY when there are no real
  // accounts at all (everything lives in General, no decision to make).
  if (hideWhenEmpty && accounts.length === 0) return null;

  const current = value !== undefined ? value : storeValue;
  const select = (raw: string) => {
    const next = raw === ALL_ACCOUNTS ? null : raw;
    if (onChange) onChange(next);
    else setActive(next);
  };

  return (
    <Select value={current ?? ALL_ACCOUNTS} onValueChange={select}>
      <SelectTrigger className={className ?? "h-9 w-44"}>
        <Landmark className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ACCOUNTS}>{t("filterAllAccounts")}</SelectItem>
        <SelectItem value={DEFAULT_BUCKET_ID}>{t("filterUnassigned")}</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
