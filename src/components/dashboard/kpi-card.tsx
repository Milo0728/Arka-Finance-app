import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
  sub?: string;
}

export const KPICard = React.memo(function KPICard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  tone = "default",
  sub,
}: KPICardProps) {
  const isPositive = (delta ?? 0) >= 0;
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : tone === "destructive"
      ? "text-destructive"
      : "text-foreground";

  return (
    <Card>
      {/* min-w-0 so flex/grid parents don't let the card overflow when
          rendered with long amounts (e.g. "COP 6,720,852.50"). */}
      <CardContent className="min-w-0 space-y-3 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        </div>
        {/* Responsive size + truncate with native tooltip: the full value is
            always reachable via hover / long-press, even when the card is
            narrow. `title` is the cheapest accessible solution here. */}
        <div
          className={cn(
            "arka-number truncate text-2xl font-semibold leading-tight sm:text-3xl",
            toneClass
          )}
          title={value}
        >
          {value}
        </div>
        {(typeof delta === "number" || sub) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {typeof delta === "number" && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}
              >
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {(deltaLabel || sub) && (
              <span className="truncate text-muted-foreground">{deltaLabel ?? sub}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
