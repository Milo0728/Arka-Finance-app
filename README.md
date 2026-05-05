# Arka Finance

> Personal finance, with the seriousness of a real product.

Arka Finance is a personal finance dashboard built around a simple thesis: most "money apps" make you log expenses but never help you _understand_ them. Arka closes that gap — multi-account, multi-currency tracking, real-time sync, optimistic UX, and an opinionated insights engine inspired by *The Richest Man in Babylon*.

This README is written for engineers reading the code. It documents what the project actually is, the decisions behind it, and where it's still rough.

---

## 1. What it is

Arka tracks income, expenses, budgets, savings goals, recurring subscriptions, and accounts across multiple currencies. Every amount is stored in USD and rendered in the user's display currency using FX rates fetched at runtime, so changing the display currency is a render-only operation.

The product surfaces:

- A **dashboard** with monthly KPIs, cashflow chart, category breakdown, and a 0–100 **Financial Health Score** (savings rate, expense ratio, budget adherence, goal progress).
- An **insights engine** that flags overspending categories, subscription creep, Babylon-rule deviation (the "save 10%" rule), and budget warnings — all computed on-device.
- **Multi-account** views with a global toggle ("All consolidated" vs. a single account).
- **CSV / XLSX import** to seed real data from a bank export.
- **Demo mode** — the app runs end-to-end without Firebase credentials, using a deterministic local seed.

---

## 2. Demo / Preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If `.env.local` is missing or incomplete, the app boots into **demo mode**: a deterministic seed populates accounts, incomes, expenses, budgets, goals, and subscriptions; all writes stay in memory + `localStorage`; auth and Firestore listeners are skipped. This is the recommended way to evaluate the UI without provisioning anything.

To run against real Firebase, copy `.env.local.example` → `.env.local` and fill in the `NEXT_PUBLIC_FIREBASE_*` keys (see §10).

---

## 3. Tech stack

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 15 (App Router, RSC where it pays off)      |
| Language         | TypeScript (strict)                                 |
| State            | Zustand (`persist` middleware)                      |
| Auth + Database  | Firebase Auth + Firestore (`onSnapshot` realtime)   |
| Styling          | TailwindCSS + shadcn/ui (Radix primitives)          |
| Charts           | Recharts                                            |
| Forms            | React Hook Form + Zod                               |
| i18n             | next-intl (en / es / fr)                            |
| Tests            | Vitest (unit) + Playwright (E2E)                    |
| CI               | GitHub Actions (lint, typecheck, unit, E2E)         |
| Imports          | `xlsx` (CSV / XLSX parsing)                         |

---

## 4. Architecture

The codebase is organised by **layer**, not by file type. The boundaries are deliberate; crossing them is the kind of thing that breaks during a refactor.

```
src/
├── app/             # App Router routes, layouts, providers
├── features/        # Feature-scoped UI (auth, income, expense, budget, goal, subscription, account)
├── components/      # Cross-feature UI (dashboard chrome, charts, shadcn primitives)
├── store/           # Zustand stores — single source of truth
├── services/        # Firestore + Auth I/O. The only place SDK calls live.
├── hooks/           # useAuth (auth listener), small stateful helpers
├── lib/             # Firebase client, FX rates, categories, formatting
├── utils/           # Pure functions: finance math, insights, seed, CSV
└── types/           # Domain models (Income, Expense, Budget, …)
```

### 4.1 Store as source of truth

`useFinanceStore` (Zustand) holds **all** domain data — accounts, incomes, expenses, budgets, goals, subscriptions, plus UI selection state (`activeAccountId`) and FX rates. Components read from selectors; they never call Firestore directly. The store is persisted via `localStorage` so a hard refresh shows the previous state instantly while the listeners reconnect in the background.

Persistence is intentionally partial: `hydrated` and `usingLocalSeed` are **not** persisted, because every fresh load must re-decide between seed and Firestore based on the current auth state — not a leftover boolean from a prior session. Migrations bump `version` when the schema changes.

### 4.2 Realtime sync via `onSnapshot`

The store attaches one Firestore listener per collection (`incomes`, `expenses`, `budgets`, `goals`, `subscriptions`, `accounts`), all scoped by `where("userId", "==", uid)`. On each snapshot, the listener replaces the corresponding slice of state.

A `markSeen` gate flips `hydrated: true` only when **all six** collections have reported at least once, so consumers that gate UI on `hydrated` never see a half-populated store.

### 4.3 Optimistic updates + rollback

Every `addX` / `updateX` / `removeX` action follows the same shape:

1. Snapshot the affected slice (`const prev = get().incomes`).
2. Apply the mutation locally — UI updates immediately.
3. Await the Firestore write.
4. On error: restore `prev` for that slice only, toast once, rethrow.

Creates pre-generate the document id client-side (`crypto.randomUUID`) and pass it to `setDoc(doc(ref, id), …)`. That way the eventual snapshot's `doc.id` matches the optimistic item — `equalByIdAndUpdatedAt` short-circuits the snapshot's `set(...)` and the user never sees an id swap or reorder flicker.

Rollbacks are precise: only the affected collection (and `activeAccountId` for `removeAccount`) is restored — never a global reset.

### 4.4 Multi-user safety (the "D4" fix)

A subtle leak: when user A logs out and user B logs in, an in-flight Firestore snapshot from A's listener can land in the store **after** the wipe, re-introducing A's data under B's session. The fix is a strict transition order, enforced in `useAuth.ts`:

```
1. unsubscribeAll()    ← stops new server emissions
2. reset()             ← wipes in-memory + localStorage
3. bootstrap(newUid)   ← attaches fresh listeners under the new identity
```

Deviations break the invariant. `reset()` deliberately does **not** defensively cleanup listeners, so a misuse fails loudly instead of silently masking a misordering.

---

## 5. Key technical decisions

### Why Zustand over Redux / Context

Redux is overkill for a single domain model. React Context re-renders every consumer on any change. Zustand gives selector-based subscriptions, no providers, no boilerplate, and a `persist` middleware that handles localStorage + migrations out of the box. The store is ~600 lines and easy to reason about as a whole.

### Why listeners in the store, not in components

If each component wired its own `onSnapshot`, we'd have:
- Duplicated listeners per collection (one per subscriber).
- Cleanup tied to component lifecycle — a remount on tab focus could leak.
- No single place to enforce the auth-transition order that prevents the D4 leak.

Keeping listeners in module scope inside the store means **one** listener per collection, **one** lifecycle managed by `bootstrap` / `unsubscribeAll`, and a single chokepoint where snapshot diffing happens.

### Why optimistic updates

Firestore writes round-trip in 100–400ms over good networks, longer on mobile. Pessimistic UX (await → set) makes the app feel sluggish for an action the user already committed to mentally. Optimistic UX is the default for any tool people use daily; rollback on error keeps it honest.

### Avoiding redundant re-renders: `equalByIdAndUpdatedAt`

`onSnapshot` fires the entire collection on every change. Naively replacing the array would trigger re-renders even when nothing meaningful changed (e.g., a snapshot acknowledging our own write). The store skips `set(...)` when the new array passes a heuristic equality check:

1. Same length.
2. Same `id` at each position.
3. Same `updatedAt ?? createdAt` at each position.

False positives are bounded: identical length + ordering + every timestamp coinciding means user-visible state is functionally identical. False negatives (re-rendering equal data) are safe — at worst, a wasted render.

### Concurrency: the auth `generation` pattern

Firebase's auth callback can fire while the previous one is still in flight (rapid login/logout, token refresh under StrictMode). The auth listener captures a monotonic `generation` token for each invocation. If a newer callback fires before the previous one finishes, the older one checks its generation, sees it's no longer current, and bails out. Combined with `lastUid` short-circuiting and `currentSubscribedUid` inside `bootstrap`, this guarantees only one bootstrap is ever active.

---

## 6. Features

- **Multi-account** — bank, cash, wallet. Each entry can be assigned to an account; the dashboard supports per-account or consolidated views.
- **Multi-currency, USD-anchored** — every amount is stored in USD; display currency is a render-time conversion using FX rates fetched at runtime (with an offline fallback table). Switching currency never mutates data.
- **CSV / XLSX import** — upload a bank export, map columns, preview, commit. Built on `xlsx`.
- **Insights engine** — pure functions over the current store snapshot: top spending category, subscription creep detection (repeating same-amount expenses with the same description), budget overshoot warnings, Babylon-rule deviation.
- **Dashboard** — monthly KPIs, cashflow series, category donut, savings trend, Babylon 10% widget, Health Score breakdown.
- **Demo mode** — deterministic seed, no Firebase needed. Toggled by absence of env config.
- **Realtime sync** — multi-tab, multi-device. `onSnapshot` keeps every open client consistent.
- **Tutorial** — versioned walkthrough (`tutorialVersion`) so returning users see updates when the flow changes meaningfully.
- **i18n** — English, Spanish, French.

---

## 7. Testing & quality

| Layer       | Tool       | Scope                                                     |
| ----------- | ---------- | --------------------------------------------------------- |
| Unit        | Vitest     | Finance math, FX, insights engine, store equality helper  |
| E2E         | Playwright | Critical flows in demo mode (login bypass, dashboard)     |
| Typecheck   | `tsc`      | Strict mode, runs in CI                                   |
| Lint        | ESLint     | `next lint` config                                        |

Coverage is targeted at `src/utils/**` and `src/lib/**` — the pure logic. UI components are validated through E2E and manual review rather than snapshot tests, which tend to be load-bearing in name only.

Commands:

```bash
npm run test          # vitest watch
npm run test:run      # one-shot
npm run test:coverage # with coverage report
npm run test:e2e      # playwright
npm run type-check
npm run lint
```

CI runs lint + typecheck + unit + E2E on every push (see `.github/workflows/ci.yml`).

---

## 8. Security & current limitations

**What's enforced:**

- Per-user isolation via Firestore Security Rules: every doc carries a `userId` field validated against `request.auth.uid`. A user cannot read or write another user's data.
- Auth transitions clear in-memory + persisted state in the documented order, preventing cross-user data leaks.
- No secrets in the client bundle — only public `NEXT_PUBLIC_FIREBASE_*` values, as designed by Firebase.

**Known limitations (deliberate, documented):**

- **No Firebase App Check.** The Firestore rules are sufficient for per-user isolation, but the project doesn't yet bind requests to verified app instances. Worth adding before opening signups beyond a controlled audience.
- **Validation is client-side only.** Zod schemas validate forms; Firestore rules enforce ownership and shape minimally but don't replicate every constraint. A malicious client could write a technically-valid but semantically-wrong document. Acceptable for a personal-use tool, not for multi-tenant production.
- **FX rates are public.** `exchangerate.host` is unauthenticated and rate-limited; the app falls back to a static table on failure. Fine for a personal tool, swap for a paid provider for SLAs.
- **No server-side rendering of user data.** All authenticated views are client-rendered to keep the auth boundary simple. Marketing pages (landing, pricing) are RSC.

---

## 9. Roadmap

Tracked, not promised:

- **Backend validation** — port Zod schemas to a thin Cloud Functions layer for write-time validation, removing the client-only assumption.
- **Advanced search & filtering** — date ranges, multi-category, free-text across descriptions.
- **Refactor the largest feature components** — a few `features/*/Form.tsx` files have grown past the point where they're easy to scan; split state into hooks, extract field groups.
- **App Check** — bind clients to verified app instances before opening public signups.
- **Stripe integration** — billing for a paid tier with multi-device sync, advanced reporting, longer history retention.
- **Recurring scheduled writes** — auto-post recurring incomes/subscriptions instead of only computing their monthly equivalents at read time.

---

## 10. Installation

### Prerequisites

- Node.js 18.18+ (or 20+)
- npm 9+
- A Firebase project (optional — demo mode runs without one)

### Steps

```bash
git clone <repo-url> arka-finance
cd arka-finance
npm install
cp .env.local.example .env.local   # optional — skip for demo mode
npm run dev
```

### Environment variables

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```

If any required Firebase value is missing, the app silently falls back to demo mode — useful for local exploration and for CI E2E runs.

### Firebase setup (only if not running in demo mode)

1. Firebase Console → Authentication → enable Email/Password, Google, GitHub.
2. Firebase Console → Firestore → create database in production mode.
3. Deploy rules and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

### Useful commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run start          # serve production build
npm run type-check     # tsc --noEmit
npm run lint           # eslint
npm run test:run       # vitest one-shot
npm run test:e2e       # playwright
```

---

## 11. Author

**Milo** — built as a portfolio project to exercise full-stack product engineering: realtime data, multi-user safety, optimistic UX, finance math, and the kind of architectural decisions that show up under load rather than in screenshots.

Inspired by *The Richest Man in Babylon* by George S. Clason.
