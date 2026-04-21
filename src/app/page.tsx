import { MarketingNav } from "@/components/landing/marketing-nav";
import { Hero } from "@/components/landing/hero";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Philosophy } from "@/components/landing/philosophy";
import { Screenshots } from "@/components/landing/screenshots";
import { Pricing } from "@/components/landing/pricing";
import { LandingCTA } from "@/components/landing/cta";
import { MarketingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <Philosophy />
        <Screenshots />
        <Pricing />
        <LandingCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
