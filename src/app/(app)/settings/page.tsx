"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  AlertTriangle,
  Palette,
  User as UserIcon,
  Coins,
  Trash2,
  RefreshCw,
  Loader2,
  HelpCircle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { useFinanceStore, persistProfile } from "@/store/useFinanceStore";
import { useMoney } from "@/hooks/useMoney";
import { CURRENCIES, formatCurrency } from "@/lib/currency";
import type { Currency } from "@/types";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { COOKIE_KEYS, setCookie } from "@/lib/preferences";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { Globe } from "lucide-react";
import { saveProfilePreferences } from "@/hooks/usePreferences";
import { useTutorialStore, type TutorialSection } from "@/store/useTutorialStore";

export default function SettingsPage() {
  const profile = useFinanceStore((s) => s.profile);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const currency = useFinanceStore((s) => s.currency);
  const setCurrency = useFinanceStore((s) => s.setCurrency);
  const reset = useFinanceStore((s) => s.reset);
  const loadRates = useFinanceStore((s) => s.loadRates);
  const loading = useFinanceStore((s) => s.loading);
  const money = useMoney();
  const { theme, setTheme } = useTheme();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tTutorial = useTranslations("tutorial.settings");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const startTutorial = useTutorialStore((s) => s.start);

  function launchTutorial(section: TutorialSection | "full") {
    startTutorial(section);
    // The tutorial controller will navigate to the correct route itself.
  }

  function pickLocale(next: Locale) {
    if (next === locale) return;
    setCookie(COOKIE_KEYS.language, next);
    void saveProfilePreferences({ language: next });
    router.refresh();
  }

  function pickCurrency(next: Currency) {
    setCurrency(next);
    void saveProfilePreferences({ currency: next });
  }

  function pickTheme(next: "light" | "dark" | "system") {
    setTheme(next);
    void saveProfilePreferences({ theme: next });
  }

  const [name, setName] = React.useState(profile?.name ?? "");
  const [monthlyIncome, setMonthlyIncome] = React.useState(
    profile?.monthlyIncome ? Number(money.fromUSD(profile.monthlyIncome).toFixed(2)) : 0
  );

  const profileName = profile?.name;
  const profileMonthlyIncome = profile?.monthlyIncome;
  const moneyRate = money.rate;

  React.useEffect(() => {
    setName(profileName ?? "");
  }, [profileName]);

  React.useEffect(() => {
    setMonthlyIncome(profileMonthlyIncome ? Number((profileMonthlyIncome * moneyRate).toFixed(2)) : 0);
  }, [profileMonthlyIncome, moneyRate]);

  async function saveProfile() {
    if (!profile) {
      toast.info(t("toasts.signInRequired"));
      return;
    }
    const updated = {
      ...profile,
      name,
      monthlyIncome: money.toUSD(monthlyIncome),
      currency,
      theme: (theme as "light" | "dark" | "system" | undefined) ?? profile.theme,
      language: locale,
    };
    setProfile(updated);
    await persistProfile(updated);
    toast.success(t("toasts.saved"));
  }

  function clearLocalData() {
    if (!confirm(t("confirmClear"))) return;
    reset();
    toast.success(t("toasts.cleared"));
  }

  async function refreshRates() {
    await loadRates(true);
    toast.success(t("toasts.fxRefreshed"));
  }

  const ratesAgo = money.ratesUpdatedAt
    ? formatDistanceToNow(parseISO(money.ratesUpdatedAt), { addSuffix: true })
    : "never";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-tutorial="page">
      <PageHeader title={t("title")} description={t("description")} />

      <Card data-tutorial="profile">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4 text-primary" />
            {t("profile")}
          </CardTitle>
          <CardDescription>{t("profileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />
            </div>
            <div className="space-y-2">
              <Label>{t("expectedMonthlyIncome")} ({money.currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveProfile}>{t("saveProfile")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card data-tutorial="currency">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-primary" />
            {t("currency")}
          </CardTitle>
          <CardDescription>{t("currencyDesc", { base: money.baseCurrency })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("displayCurrency")}</Label>
            <Select value={currency} onValueChange={(v) => pickCurrency(v as Currency)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} · {c.label} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("exchangeRate")}</span>
                  <Badge variant={money.ratesSource === "live" ? "success" : "warning"} className="text-[10px]">
                    {money.ratesSource === "live" ? tCommon("live") : tCommon("fallback")}
                  </Badge>
                </div>
                <p className="arka-number text-lg font-semibold">
                  {formatCurrency(1, money.baseCurrency)} ≈ {formatCurrency(money.rate, money.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("lastUpdated", { ago: money.ratesUpdatedAt ? ratesAgo : t("never") })}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={refreshRates} disabled={loading.rates}>
                {loading.rates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-1">{tCommon("refresh")}</span>
              </Button>
            </div>
          </div>

          {money.currency !== money.baseCurrency && (
            <p className="text-xs text-muted-foreground">{t("tip", { base: money.baseCurrency })}</p>
          )}
        </CardContent>
      </Card>

      <Card data-tutorial="appearance">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            {t("appearance")}
          </CardTitle>
          <CardDescription>{t("appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("darkMode")}</p>
              <p className="text-xs text-muted-foreground">{t("darkModeDesc")}</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(v) => pickTheme(v ? "dark" : "light")} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("followSystem")}</p>
              <p className="text-xs text-muted-foreground">{t("followSystemDesc")}</p>
            </div>
            <Switch checked={theme === "system"} onCheckedChange={(v) => pickTheme(v ? "system" : "light")} />
          </div>
        </CardContent>
      </Card>

      <Card data-tutorial="language">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            {t("language")}
          </CardTitle>
          <CardDescription>{t("languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((code) => (
              <Button
                key={code}
                size="sm"
                variant={code === locale ? "default" : "outline"}
                onClick={() => pickLocale(code)}
              >
                {LOCALE_LABELS[code].native}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-tutorial="help">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-primary" />
            {tTutorial("title")}
          </CardTitle>
          <CardDescription>{tTutorial("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="sm" onClick={() => launchTutorial("full")}>
            <Play className="h-4 w-4" />
            <span className="ml-1">{tTutorial("restartFull")}</span>
          </Button>
          <Separator />
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "overview" as const, label: tTutorial("replayOverviewLabel") },
              { key: "charts" as const, label: tTutorial("replayChartsLabel") },
              { key: "score" as const, label: tTutorial("replayScoreLabel") },
              { key: "insights" as const, label: tTutorial("replayInsightsLabel") },
              { key: "income" as const, label: tTutorial("replayIncomeLabel") },
              { key: "expenses" as const, label: tTutorial("replayExpensesLabel") },
              { key: "budgets" as const, label: tTutorial("replayBudgetsLabel") },
              { key: "goals" as const, label: tTutorial("replayGoalsLabel") },
              { key: "subscriptions" as const, label: tTutorial("replaySubscriptionsLabel") },
              { key: "insightsPage" as const, label: tTutorial("replayInsightsPageLabel") },
              { key: "reports" as const, label: tTutorial("replayReportsLabel") },
              { key: "settings" as const, label: tTutorial("replaySettingsLabel") },
            ].map((section) => (
              <Button
                key={section.key}
                size="sm"
                variant="outline"
                onClick={() => launchTutorial(section.key)}
                className="justify-between"
              >
                <span>{section.label}</span>
                <span className="text-xs text-muted-foreground">{tTutorial("replay")}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("dangerZone")}
          </CardTitle>
          <CardDescription>{t("dangerZoneDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={clearLocalData}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-1">{t("clearLocal")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
