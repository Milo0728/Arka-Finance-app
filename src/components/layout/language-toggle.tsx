"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COOKIE_KEYS, setCookie } from "@/lib/preferences";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { saveProfilePreferences } from "@/hooks/usePreferences";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  function pick(next: Locale) {
    if (next === active) return;
    setCookie(COOKIE_KEYS.language, next);
    void saveProfilePreferences({ language: next });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          aria-label="Change language"
          className="text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          {!compact && (
            <span className="ml-2 text-sm" suppressHydrationWarning>
              {mounted ? LOCALE_LABELS[active].flag : "–"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => pick(code)}
            className={cn("flex items-center justify-between", code === active && "font-medium")}
          >
            <span>{LOCALE_LABELS[code].native}</span>
            {code === active && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
