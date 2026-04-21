import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
  return (
    <section className="border-t py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 p-10 text-white shadow-xl sm:p-16">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_auto] lg:items-end">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                Start today
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                A tenth is yours to keep.
                <br />
                <span className="text-white/80">Start saving it on purpose.</span>
              </h2>
              <p className="max-w-xl text-white/70">
                Create your free Arka account in under a minute. No credit card needed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">
                  Create free account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/login">I already have one</Link>
              </Button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
