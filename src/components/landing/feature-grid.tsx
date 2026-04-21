"use client";

import {
  BarChart3,
  PiggyBank,
  Target,
  Sparkles,
  ShieldCheck,
  Repeat,
  Heart,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Wallet,
    title: "Income & expenses",
    description:
      "Log every inflow and outflow with categories, fixed vs variable types, and rich notes.",
  },
  {
    icon: BarChart3,
    title: "Visual dashboard",
    description:
      "Clean, calm charts: cashflow trend, spending by category, savings momentum — all at a glance.",
  },
  {
    icon: Target,
    title: "Goals & budgets",
    description:
      "Plan monthly budgets per category and set financial goals with automatic monthly targets.",
  },
  {
    icon: PiggyBank,
    title: "Babylon 10% rule",
    description:
      "Arkad's core principle baked in: Arka tells you how much to save this month, every month.",
  },
  {
    icon: Sparkles,
    title: "Automatic insights",
    description:
      "Personalised nudges: category overshoots, subscription creep, savings opportunities.",
  },
  {
    icon: Repeat,
    title: "Subscription radar",
    description:
      "Detects recurring charges automatically and shows the total you pay every month and year.",
  },
  {
    icon: Heart,
    title: "Financial health score",
    description:
      "A single 0–100 score that reflects your savings rate, spending habits and goal progress.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description:
      "Firebase Auth with Google, GitHub and email — strict Firestore rules isolate your data.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="border-t bg-muted/20 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Every tool you need
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Manage your money without the anxiety
          </h2>
          <p className="mt-4 text-muted-foreground">
            Arka wraps the spreadsheet-level control of YNAB with the simplicity of a modern fintech
            app — and adds a philosophy that&apos;s lasted 8,000 years.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="group relative overflow-hidden border bg-card/80 p-0 transition hover:shadow-md">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
              <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
