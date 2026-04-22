import Link from "next/link";
import { MarketingFooter } from "@/components/landing/footer";
import { Logo } from "@/components/brand/logo";

type Section = { heading: string; body: string };

export function LegalShell({
  title,
  lastUpdated,
  intro,
  sections,
  contact,
  backLabel,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
  contact: string;
  backLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/70 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="container max-w-3xl py-16">
          <header className="space-y-3 border-b pb-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {lastUpdated}
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="text-base text-muted-foreground">{intro}</p>
          </header>

          <div className="mt-10 space-y-8">
            {sections.map((s) => (
              <section key={s.heading} className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>

          <p className="mt-12 rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
            {contact}
          </p>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}
