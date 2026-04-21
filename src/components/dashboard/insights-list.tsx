"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
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

export function InsightsList({ insights, title = "Insights" }: { insights: FinancialInsight[]; title?: string }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Curated automatically from your activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors", toneMap[insight.level])}
          >
            <div className="mt-0.5">{iconMap[insight.level]}</div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold">{insight.title}</h4>
                {insight.value && (
                  <span className="arka-number text-sm font-medium text-foreground">{insight.value}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
