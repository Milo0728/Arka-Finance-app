"use client";

import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const series = [28, 36, 32, 40, 44, 52, 58, 63, 68, 74, 79, 88];
const max = Math.max(...series);

export function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500/20 via-brand-400/10 to-transparent blur-2xl" />
      <Card className="relative overflow-hidden border-border/80 bg-card/95 shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-destructive/70" />
            <span className="flex h-2 w-2 rounded-full bg-warning/70" />
            <span className="flex h-2 w-2 rounded-full bg-success/70" />
            <span className="ml-3 text-xs font-medium text-muted-foreground">Arka · Overview</span>
          </div>
          <Badge variant="success" className="text-[10px] uppercase tracking-wider">Live</Badge>
        </div>

        <div className="grid gap-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Net balance
              </div>
              <div className="mt-1 arka-number text-2xl font-semibold">$18,420.54</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="h-3 w-3" /> +8.4% this month
              </div>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PiggyBank className="h-3.5 w-3.5" /> Saved in April
              </div>
              <div className="mt-1 arka-number text-2xl font-semibold">$640.00</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                <ArrowDownRight className="h-3 w-3" /> 2% below Babylon target
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cashflow (last 12 months)</span>
              <Badge variant="muted" className="text-[10px]">USD</Badge>
            </div>
            <div className="mt-3 flex h-28 items-end gap-1.5">
              {series.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-brand-700 via-brand-500 to-brand-300"
                  style={{ height: `${(value / max) * 100}%`, opacity: 0.4 + (i / series.length) * 0.6 }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Food budget</span>
              <span className="text-foreground">$412 / $600</span>
            </div>
            <Progress value={68} indicatorClassName="bg-gradient-to-r from-brand-500 to-brand-400" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Japan trip goal</span>
              <span className="text-foreground">25%</span>
            </div>
            <Progress value={25} indicatorClassName="bg-gradient-to-r from-amber-500 to-brand-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}
