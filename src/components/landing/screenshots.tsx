import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Gauge, Sparkles } from "lucide-react";

export function Screenshots() {
  return (
    <section id="screens" className="border-t bg-muted/20 py-24">
      <div className="container space-y-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Product tour</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One dashboard, total clarity.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each surface of Arka is designed to hand you an answer in under 30 seconds.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">Overview</Badge>
            <h3 className="text-lg font-semibold">Know where the money goes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              KPI cards for balance, income, expenses and savings rate — paired with a donut of
              category spend.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["Balance", "Income", "Expenses", "Savings"].map((label, i) => (
                <div key={label} className="rounded-md border bg-background/70 p-3 text-xs">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="arka-number mt-1 text-base font-semibold">
                    ${[18420, 6050, 3680, 640][i].toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">Budgets</Badge>
            <h3 className="text-lg font-semibold">Spend within guardrails</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Budgets per category with progress bars and timely alerts when you approach the limit.
            </p>
            <div className="mt-6 space-y-3 text-xs">
              {[
                { name: "Food", pct: 68, color: "bg-brand-500" },
                { name: "Transport", pct: 42, color: "bg-sky-500" },
                { name: "Entertainment", pct: 88, color: "bg-amber-500" },
                { name: "Subscriptions", pct: 100, color: "bg-rose-500" },
              ].map((b) => (
                <div key={b.name} className="space-y-1">
                  <div className="flex justify-between">
                    <span>{b.name}</span>
                    <span className="text-muted-foreground">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden border bg-card p-6">
            <Badge variant="secondary" className="mb-4">Health</Badge>
            <h3 className="text-lg font-semibold">Financial Health Score</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A single 0–100 score blending savings rate, spending discipline, budget adherence and
              goal progress.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(78 / 100) * 264}, 264`}
                    strokeLinecap="round"
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">78</div>
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2 text-success"><Gauge className="h-3 w-3" /> Good</div>
                <div className="mt-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Savings rate 14%</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> +4 pts MoM</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
