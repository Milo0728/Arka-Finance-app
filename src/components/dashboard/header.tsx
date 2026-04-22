"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LogOut,
  Menu,
  Search,
  Plus,
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { logout } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Logo } from "@/components/brand/logo";

const MOBILE_LINKS = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard },
  { href: "/income", key: "income", icon: TrendingUp },
  { href: "/expenses", key: "expenses", icon: Wallet },
  { href: "/budgets", key: "budgets", icon: PiggyBank },
  { href: "/goals", key: "goals", icon: Target },
  { href: "/subscriptions", key: "subscriptions", icon: Repeat },
  { href: "/insights", key: "insights", icon: Sparkles },
  { href: "/reports", key: "reports", icon: FileBarChart2 },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function DashboardHeader({ onQuickAdd }: { onQuickAdd?: () => void }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const user = useAuthStore((s) => s.user);
  const profile = useFinanceStore((s) => s.profile);
  const reset = useFinanceStore((s) => s.reset);
  const tNav = useTranslations("nav");
  const tHeader = useTranslations("header");
  const tCommon = useTranslations("common");

  const displayName = user?.displayName || profile?.name || tHeader("defaultName");
  const displayEmail = user?.email || profile?.email || tHeader("defaultEmail");
  const initial = displayName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  async function handleLogout() {
    try {
      if (isFirebaseConfigured) await logout();
      reset();
      toast.success(tCommon("signOut"));
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tHeader("signOutFailed"));
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={tHeader("toggleNav")}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="lg:hidden">
        <Logo showWordmark={false} />
      </div>

      <div className="relative ml-auto hidden w-full max-w-sm items-center sm:flex">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder={tHeader("searchPlaceholder")} className="h-9 pl-9" />
      </div>

      <Button size="sm" onClick={onQuickAdd} className="hidden sm:inline-flex">
        <Plus className="h-4 w-4" />
        <span className="ml-1">{tCommon("quickAdd")}</span>
      </Button>

      <LanguageToggle compact />
      <ThemeToggle compact />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <Avatar className="h-9 w-9 ring-2 ring-transparent transition hover:ring-primary/30">
              {user?.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />}
              <AvatarFallback>{initial || "AR"}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">{displayName}</div>
              <div className="text-xs text-muted-foreground">{displayEmail}</div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">{tHeader("preferences")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/reports">{tHeader("exportData")}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> {tCommon("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-40 border-b bg-background p-4 shadow-lg lg:hidden">
          <nav className="grid gap-1">
            {MOBILE_LINKS.map(({ href, key, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {tNav(key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
