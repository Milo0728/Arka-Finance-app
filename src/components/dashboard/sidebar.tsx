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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";

const ITEMS = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard },
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

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/40 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("workspace")}
        </p>
        {ITEMS.map(({ href, key, icon: Icon }) => {
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
