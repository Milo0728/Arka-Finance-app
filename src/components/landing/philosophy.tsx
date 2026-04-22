"use client";

import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import { Card } from "@/components/ui/card";

const LAW_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6", "l7"] as const;

export function Philosophy() {
  const t = useTranslations("landing.philosophy");
  return (
    <section id="philosophy" className="border-t py-24">
      <div className="container grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
          <p className="text-muted-foreground">
            {t("bodyPrefix")}<em>{t("bodyBook")}</em>{t("bodySuffix")}
          </p>
          <Card className="relative overflow-hidden border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6">
            <Quote className="mb-3 h-5 w-5 text-primary" />
            <blockquote className="text-balance text-lg italic leading-relaxed text-foreground">
              &ldquo;{t("quote")}&rdquo;
            </blockquote>
            <p className="mt-3 text-sm text-muted-foreground">{t("quoteAuthor")}</p>
          </Card>
        </div>

        <ol className="relative grid gap-4">
          {LAW_KEYS.map((key, idx) => (
            <li key={key} className="group flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {idx + 1}
              </div>
              <div>
                <h3 className="font-semibold">{t(`laws.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`laws.${key}.detail`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
