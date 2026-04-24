/**
 * Single source of truth for the app's marketing version. Shown in the
 * sidebar badge and used to decide whether to surface the "what's new" modal
 * on the next load.
 *
 * Bump this when you ship user-visible changes AND have added an entry for
 * the same key in `lib/changelog.ts`. They ride together — changing one
 * without the other is a no-op or an empty modal.
 */
export const APP_VERSION = "1.0.1";

/** localStorage key used to remember the last version the user acknowledged. */
export const LAST_SEEN_VERSION_KEY = "arka_last_seen_version";
