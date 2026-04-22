import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/legal/legal-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const tRoot = await getTranslations("legal");
  const sections = t.raw("sections") as { heading: string; body: string }[];

  return (
    <LegalShell
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      intro={t("intro")}
      sections={sections}
      contact={t("contact")}
      backLabel={tRoot("backToHome")}
    />
  );
}
