import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Everything you need to take control.",
    features: ["Unlimited accounts", "Up to 6 months of history", "All dashboards and insights", "Dark mode"],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Arkad",
    price: "$6",
    period: "/ month",
    description: "For serious wealth builders.",
    features: [
      "Unlimited history",
      "Subscription radar",
      "CSV exports",
      "Automated recommendations",
      "Priority support",
    ],
    cta: "Upgrade to Arkad",
    highlighted: true,
  },
  {
    name: "Household",
    price: "$10",
    period: "/ month",
    description: "Manage finances with your partner or family.",
    features: [
      "Everything in Arkad",
      "Up to 5 seats",
      "Shared budgets and goals",
      "Per-member health scores",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free. Upgrade when it pays for itself.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Arka pays for itself the first time it prevents an overspend. Guaranteed.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`flex flex-col gap-6 border bg-card p-7 ${
                tier.highlighted ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{tier.name}</h3>
                  {tier.highlighted && <Badge>Most popular</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
                {tier.period && <span className="text-sm text-muted-foreground">{tier.period}</span>}
              </div>
              <ul className="space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={tier.highlighted ? "default" : "outline"}>
                <Link href="/register">{tier.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
