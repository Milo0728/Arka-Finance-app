export const LOCALES = ["en", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { label: string; native: string; flag: string }> = {
  en: { label: "English", native: "English", flag: "EN" },
  es: { label: "Spanish", native: "Español", flag: "ES" },
  fr: { label: "French", native: "Français", flag: "FR" },
};

export function resolveLocale(input: unknown): Locale {
  if (typeof input === "string" && (LOCALES as readonly string[]).includes(input)) {
    return input as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Dynamic import of messages by locale so each bundle ships only what it needs.
 */
export async function loadMessages(locale: Locale) {
  switch (locale) {
    case "es":
      return (await import("@/messages/es.json")).default;
    case "fr":
      return (await import("@/messages/fr.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}
