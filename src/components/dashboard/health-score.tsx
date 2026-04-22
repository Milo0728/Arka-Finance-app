"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HealthScoreBreakdown } from "@/types";
import { cn } from "@/lib/utils";

const TONE: Record<HealthScoreBreakdown["tier"], string> = {
  critical: "text-destructive",
  poor: "text-warning",
  fair: "text-warning",
  good: "text-success",
  excellent: "text-success",
};

interface HealthScoreProps {
  score: HealthScoreBreakdown;
  /** When false, render an empty/neutral state instead of the computed score. */
  hasData?: boolean;
}

export function HealthScore({ score, hasData = true }: HealthScoreProps) {
  const t = useTranslations("health");

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">{t("noDataTitle")}</p>
            <p className="max-w-[280px] text-xs text-muted-foreground">{t("noDataDesc")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score.score / 100) * circumference;
  const tone = TONE[score.tier];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={cn("transition-all", tone)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="arka-number text-3xl font-semibold">{score.score}</span>
              <span className={cn("text-[11px] font-medium uppercase tracking-wider", tone)}>
                {t(score.tier)}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t(`${score.tier}Desc`)}</p>
        </div>

        <div className="space-y-3">
          <MetricRow label={t("savingsRate")} value={score.savingsRate} max={30} unit="%" />
          <MetricRow label={t("spendToIncome")} value={score.expenseRatio} max={120} unit="%" inverse />
          <MetricRow label={t("budgetAdherence")} value={score.budgetAdherence} max={100} unit="%" />
          <MetricRow label={t("goalProgress")} value={score.goalProgress} max={100} unit="%" />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  max,
  unit,
  inverse,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  inverse?: boolean;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(max, safe));
  const pct = (clamped / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="arka-number text-foreground">
          {safe.toFixed(1)}
          {unit}
        </span>
      </div>
      <Progress
        value={pct}
        indicatorClassName={cn(
          "transition-all",
          inverse
            ? pct > 80
              ? "bg-destructive"
              : pct > 60
              ? "bg-warning"
              : "bg-success"
            : pct > 70
            ? "bg-success"
            : pct > 40
            ? "bg-warning"
            : "bg-destructive"
        )}
      />
    </div>
  );
}
