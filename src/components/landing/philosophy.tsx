import { Quote } from "lucide-react";
import { Card } from "@/components/ui/card";

const laws = [
  { title: "Pay yourself first", detail: "Save at least one tenth of every income before any expense." },
  { title: "Control your expenses", detail: "Live within a budget calibrated to the life you want." },
  { title: "Make your gold multiply", detail: "Put savings to work through deliberate investing." },
  { title: "Guard your treasure", detail: "Protect your money against loss and avoid schemes." },
  { title: "Own your home", detail: "Direct a portion toward assets that build equity." },
  { title: "Plan future income", detail: "Prepare for old age and the protection of loved ones." },
  { title: "Increase earning power", detail: "Keep learning — skill compounds faster than capital." },
];

export function Philosophy() {
  return (
    <section id="philosophy" className="border-t py-24">
      <div className="container grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            The philosophy
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Babylon&apos;s seven rules, built into the product.
          </h2>
          <p className="text-muted-foreground">
            In <em>The Richest Man in Babylon</em>, Arkad shares seven simple rules for a life of
            wealth. Arka Finance turns those rules into gentle daily nudges — so the philosophy
            becomes a habit.
          </p>
          <Card className="relative overflow-hidden border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6">
            <Quote className="mb-3 h-5 w-5 text-primary" />
            <blockquote className="text-balance text-lg italic leading-relaxed text-foreground">
              &ldquo;A part of all you earn is yours to keep. Not less than a tenth, no matter how little
              you earn.&rdquo;
            </blockquote>
            <p className="mt-3 text-sm text-muted-foreground">— Arkad, The Richest Man in Babylon</p>
          </Card>
        </div>

        <ol className="relative grid gap-4">
          {laws.map((law, idx) => (
            <li key={law.title} className="group flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {idx + 1}
              </div>
              <div>
                <h3 className="font-semibold">{law.title}</h3>
                <p className="text-sm text-muted-foreground">{law.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
