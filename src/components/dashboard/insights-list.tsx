"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialInsight } from "@/types";
import { cn } from "@/lib/utils";

const iconMap: Record<FinancialInsight["level"], React.ReactNode> = {
  positive: <CheckCircle2 className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  critical: <AlertCircle className="h-4 w-4 text-destructive" />,
  info: <Info className="h-4 w-4 text-primary" />,
};

const toneMap: Record<FinancialInsight["level"], string> = {
  positive: "bg-success/10 border-success/30",
  warning: "bg-warning/10 border-warning/30",
  critical: "bg-destructive/10 border-destructive/30",
  info: "bg-primary/5 border-primary/20",
};

const heroToneMap: Record<FinancialInsight["level"], string> = {
  positive: "bg-success/15 border-success/50 ring-1 ring-success/20",
  warning: "bg-warning/15 border-warning/50 ring-1 ring-warning/20",
  critical: "bg-destructive/15 border-destructive/50 ring-1 ring-destructive/20",
  info: "bg-primary/10 border-primary/40 ring-1 ring-primary/20",
};

export function InsightsList({
  insights,
  title,
  /**
   * When true (the default on dashboard), the first insight in the list is
   * rendered as a hero card. The list is assumed to already be severity-sorted
   * (see `prioritizeInsights`). Pass `featured={false}` for flat lists like
   * the full /insights page.
   */
  featured = true,
}: {
  insights: FinancialInsight[];
  title?: string;
  featured?: boolean;
}) {
  const t = useTranslations("insights");
  const tRules = useTranslations("insights.rules");
  const heading = title ?? t("defaultTitle");

  const [hero, ...rest] = insights;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{heading}</CardTitle>
        <CardDescription>{t("curatedDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">{t("empty.title")}</p>
            <p className="text-xs text-muted-foreground">{t("empty.description")}</p>
          </div>
        ) : (
          <>
            {featured && hero ? (
              <div className={cn("flex items-start gap-3 rounded-xl border p-4 transition-colors", heroToneMap[hero.level])}>
                <div className="mt-0.5">{iconMap[hero.level]}</div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("primaryLabel")}
                  </p>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-base font-semibold">
                      {tRules(hero.titleKey, hero.titleValues ?? {})}
                    </h4>
                    {hero.value && (
                      <span className="arka-number text-base font-semibold text-foreground">{hero.value}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tRules(hero.descriptionKey, hero.descriptionValues ?? {})}
                  </p>
                </div>
              </div>
            ) : null}
            {(featured ? rest : insights).map((insight) => (
              <div
                key={insight.id}
                className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors", toneMap[insight.level])}
              >
                <div className="mt-0.5">{iconMap[insight.level]}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold">
                      {tRules(insight.titleKey, insight.titleValues ?? {})}
                    </h4>
                    {insight.value && (
                      <span className="arka-number text-sm font-medium text-foreground">{insight.value}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tRules(insight.descriptionKey, insight.descriptionValues ?? {})}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
