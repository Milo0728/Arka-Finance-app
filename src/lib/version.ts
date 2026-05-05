// Single source of truth for the marketing version is package.json — bump it
// there and this constant follows automatically. Keeping a JSON import (rather
// than re-typing the string) means we can never ship the sidebar badge, the
// changelog modal lookup, and the npm version drifting apart.
//
// Destructuring at import keeps TypeScript happy and lets the bundler treat
// the import as a single property access. The whole package.json ends up in
// the chunk that pulls this module, but it's tiny (~2 KB) and only the
// dashboard layout depends on it.
//
// When you ship user-visible changes:
//   1. bump `version` in package.json
//   2. add an entry under the same key in `lib/changelog.ts`
// If you bump one without the other, the modal will either not show or render
// empty — both are visible enough to catch in dev.
import { version } from "../../package.json";

export const APP_VERSION: string = version;

/** localStorage key used to remember the last version the user acknowledged. */
export const LAST_SEEN_VERSION_KEY = "arka_last_seen_version";
