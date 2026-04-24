"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target,
  Repeat,
  Sparkles,
  FileBarChart2,
  Settings,
  Landmark,
} from "lucide-react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/lib/version";
import { useChangelogStore } from "@/store/useChangelogStore";

type NavItem = {
  href: string;
  key: "overview" | "accounts" | "income" | "expenses" | "budgets" | "goals" | "subscriptions" | "insights" | "reports";
  icon: typeof LayoutDashboard;
  /** Optional feature flag — when set, the item only renders if the flag is on. */
  feature?: "multiAccount";
};

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard },
  { href: "/accounts", key: "accounts", icon: Landmark, feature: "multiAccount" },
  { href: "/income", key: "income", icon: TrendingUp },
  { href: "/expenses", key: "expenses", icon: Wallet },
  { href: "/budgets", key: "budgets", icon: PiggyBank },
  { href: "/goals", key: "goals", icon: Target },
  { href: "/subscriptions", key: "subscriptions", icon: Repeat },
  { href: "/insights", key: "insights", icon: Sparkles },
  { href: "/reports", key: "reports", icon: FileBarChart2 },
] as const;

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const openChangelog = useChangelogStore((s) => s.open);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/40 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Logo />
        {/* Beta badge doubles as the "what's new" entry point — clicking it
            always opens the changelog modal, regardless of whether the user
            already dismissed the auto-popup. */}
        <button
          type="button"
          onClick={openChangelog}
          className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={tCommon("beta") + " " + APP_VERSION}
        >
          {tCommon("beta")} {APP_VERSION}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("workspace")}
        </p>
        {ITEMS.filter((item) => !item.feature || isFeatureEnabled(item.feature)).map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-4 py-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            pathname?.startsWith("/settings") && "bg-muted text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          {t("settings")}
        </Link>

        <div className="mt-4 rounded-xl border border-dashed bg-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t("babylonRuleTitle")}</span>
            <Badge variant="success" className="text-[10px]">{t("babylonRuleActive")}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("babylonRuleBody")}</p>
        </div>
      </div>
    </aside>
  );
});
