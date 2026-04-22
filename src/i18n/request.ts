import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { loadMessages, resolveLocale } from "./config";

/**
 * next-intl reads this on every server request to know which locale + messages
 * to hand to the provider tree. The path is wired in next.config.mjs via the
 * `createNextIntlPlugin` helper.
 *
 * Cookie key is inlined (matches COOKIE_KEYS.language from preferences.ts) because
 * that module is "use client" and can't be imported into server config.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("user_language")?.value);
  // Cast: next-intl's AbstractIntlMessages doesn't model arrays in JSON, but
  // `t.raw(...)` handles them at runtime. Legal pages iterate `sections` arrays.
  return {
    locale,
    messages: (await loadMessages(locale)) as unknown as AbstractIntlMessages,
  };
});
