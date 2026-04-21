# Arka Finance

> Money you understand. Wealth that compounds.

Arka Finance is a modern, production-ready personal finance dashboard inspired by *The Richest Man in Babylon*. Track income and expenses, plan budgets, follow Arkad's 10% rule, and visualise your financial health — all in one clean, fintech-style app.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Firebase**, **TailwindCSS** and **shadcn/ui**.

---

## Features

- **Landing page** — hero, feature grid, seven laws philosophy, product tour, pricing, CTA
- **Authentication** — Email/Password, Google, GitHub (Firebase Auth); password reset
- **Dashboard** — balance, monthly income/expense KPIs, cashflow chart, category donut, savings trend, Babylon 10% widget, Financial Health Score, live insights
- **Income / Expenses managers** — full CRUD with filtering, search, category + fixed/variable typing
- **Budget Planner** — per-category monthly budgets with progress bars and overshoot alerts
- **Financial Goals** — target amount + deadline, automatic "save per month" calculation
- **Subscription radar** — recurring charge detection from expenses
- **Insights engine** — on-device recommendations (top category, subscription creep, Babylon rule adherence, budget warnings)
- **Financial Health Score** — 0–100 composite covering savings rate, spending ratio, budget adherence and goal progress
- **Reports** — 6-month summary + CSV export for incomes, expenses and monthly summary
- **Dark mode** — light/dark/system, persisted via cookies
- **Multi-currency** — USD is the canonical base; every amount is stored in USD and converted on render using live FX rates from `exchangerate.host` (with an offline fallback table). Settings exposes the current rate, last-updated timestamp, and a manual refresh.
- **Feature-based architecture** — clean separation of `app`, `components`, `features`, `hooks`, `lib`, `services`, `store`, `types`, `utils`
- **Demo mode** — the app ships with realistic sample data and works without Firebase credentials

---

## Tech stack

| Area            | Tool                                              |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 14 (App Router) + React Server Components |
| Language        | TypeScript (strict)                               |
| Styling         | TailwindCSS + shadcn/ui + Radix UI                |
| Icons           | lucide-react                                      |
| Charts          | Recharts                                          |
| Animations      | Framer Motion                                     |
| Forms           | React Hook Form + Zod                             |
| State           | Zustand (persisted)                               |
| Theme           | next-themes + js-cookie                           |
| Notifications   | Sonner                                            |
| Tables          | TanStack Table primitives                         |
| Dates           | date-fns                                          |
| Auth / Database | Firebase Auth + Firestore                         |

---

## Getting started locally

### Prerequisites

- Node.js 18.18+ (or 20+)
- npm 9+ / pnpm / yarn — examples below use `npm`
- A Firebase project (optional — the app runs with local demo data if you skip this)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Firebase web config values:

```bash
cp .env.local.example .env.local
```

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```

> If `.env.local` is missing or incomplete the app automatically falls back to **demo mode** with sample income, expenses, budgets, goals and subscriptions so you can explore the UI immediately.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Type-check / lint

```bash
npm run type-check
npm run lint
```

---

## Firebase setup

### Enable services

In the Firebase console:

1. **Authentication → Sign-in method**: enable `Email/Password`, `Google`, and `GitHub`.
2. **Firestore Database**: create a database in production mode.

### Deploy security rules & indexes

From the project root:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

The rules (`firestore.rules`) enforce strict per-user isolation — a document is only readable/writable by the user whose `userId` matches their Firebase Auth UID.

### Firestore data model

```
users/{uid}              → UserProfile
incomes/{id}             → Income (userId)
expenses/{id}            → Expense (userId)
budgets/{id}             → Budget (userId)
goals/{id}               → Goal (userId)
subscriptions/{id}       → Subscription (userId)
```

---

## Deployment

### Option A — Vercel (recommended for Next.js)

1. Push the repo to GitHub.
2. On [vercel.com](https://vercel.com), import the repo.
3. Add the `NEXT_PUBLIC_FIREBASE_*` env vars under **Project Settings → Environment Variables**.
4. Deploy. Vercel will auto-detect Next.js and build with `npm run build`.

Vercel's default configuration works out of the box — no extra settings needed.

### Option B — Firebase Hosting with App Hosting (SSR)

Firebase App Hosting supports Next.js SSR natively:

```bash
firebase experiments:enable webframeworks
firebase init hosting     # pick "Use an existing project" and your web framework
firebase deploy --only hosting
```

Firebase will build and deploy the Next.js app, wiring up SSR through Cloud Run.

### Option C — Static-only Firebase Hosting

If you want a static export:

1. Add `output: "export"` to `next.config.mjs` (only if you remove server-only routes).
2. `npm run build`
3. `firebase deploy --only hosting`

The included `firebase.json` maps `.next` as the public directory for a quick static test — customise it to suit the deployment target you pick.

---

## Project structure

```
src/
├─ app/                       # App Router routes
│  ├─ (auth)/                 # login, register, reset
│  ├─ (app)/                  # dashboard + feature pages (behind app chrome)
│  ├─ layout.tsx              # root layout with providers
│  ├─ providers.tsx           # theme + toasts + auth listener
│  └─ page.tsx                # landing page
├─ components/
│  ├─ brand/                  # logo
│  ├─ dashboard/              # sidebar, header, KPI, charts, insights, health score
│  ├─ landing/                # marketing sections
│  ├─ theme/                  # theme provider + toggle
│  └─ ui/                     # shadcn primitives (Button, Card, Dialog, …)
├─ features/                  # feature-scoped components
│  ├─ auth/
│  ├─ income/
│  ├─ expense/
│  ├─ budget/
│  ├─ goal/
│  └─ subscription/
├─ hooks/
├─ lib/                       # firebase client, currency, utils, categories
├─ services/                  # auth service, firestore CRUD services
├─ store/                     # Zustand stores (auth, finance + persistence)
├─ types/                     # shared TypeScript models
└─ utils/                     # finance math, insights engine, CSV export, seed data
```

Architecture follows **feature-based** organisation: each feature owns its forms and UI, while cross-cutting concerns (UI primitives, stores, types) live outside. Services are the single I/O boundary — swap Firestore for another backend by replacing files in `src/services/`.

---

## Accessibility & performance

- Server Components used for static surfaces (landing, layouts).
- Client Components limited to interactive pages.
- `lucide-react`, `recharts`, `date-fns` lazily import via `optimizePackageImports`.
- Keyboard-friendly shadcn/Radix primitives throughout.
- Adequate contrast ratios in both light and dark themes.
- Global keyboard shortcut `⌘/Ctrl + K` opens Quick Add.

---

## Security

- Firebase Authentication for identity.
- Strict Firestore rules ensure one user can never read or modify another user's data.
- All `userId` fields are validated server-side against `request.auth.uid`.
- No secrets in the client bundle (only public `NEXT_PUBLIC_` values, as intended by Firebase).

---

## Disclaimer

Arka Finance is a personal finance tool. It is **not** a licensed financial advisor. Use your judgement; consult a professional for important decisions.

Inspired by *The Richest Man in Babylon* by George S. Clason.
