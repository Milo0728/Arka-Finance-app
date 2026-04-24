"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TourProvider, useTour, type StepType } from "@reactour/tour";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  useTutorialStore,
  TUTORIAL_VERSION,
  type TutorialSection,
} from "@/store/useTutorialStore";
import { COOKIE_KEYS, getCookie } from "@/lib/preferences";

type Position = StepType["position"];

interface SectionConfig {
  route: string;
  stepKeys: string[];
}

const SECTIONS: Record<TutorialSection, SectionConfig> = {
  // Dashboard
  overview: { route: "/dashboard", stepKeys: ["welcome", "balance", "income", "expenses"] },
  charts: { route: "/dashboard", stepKeys: ["charts"] },
  score: { route: "/dashboard", stepKeys: ["score"] },
  insights: { route: "/dashboard", stepKeys: ["insights"] },
  // Pages
  income: { route: "/income", stepKeys: ["incomePage", "incomeAdd", "incomeTable"] },
  expenses: { route: "/expenses", stepKeys: ["expensesPage", "expensesAdd", "expensesTable"] },
  budgets: { route: "/budgets", stepKeys: ["budgetsPage", "budgetsAdd", "budgetsGrid"] },
  goals: { route: "/goals", stepKeys: ["goalsPage", "goalsAdd", "goalsGrid"] },
  subscriptions: {
    route: "/subscriptions",
    stepKeys: ["subscriptionsPage", "subscriptionsAdd", "subscriptionsTable"],
  },
  insightsPage: { route: "/insights", stepKeys: ["insightsFull", "insightsAll"] },
  reports: { route: "/reports", stepKeys: ["reportsPage", "reportsTable"] },
  settings: {
    route: "/settings",
    stepKeys: ["settingsProfile", "settingsCurrency", "settingsAppearance", "settingsLanguage", "settingsHelp"],
  },
  done: { route: "/dashboard", stepKeys: ["done"] },
};

const STEP_TARGETS: Record<string, { selector: string; position?: Position }> = {
  // Dashboard
  welcome: { selector: "[data-tutorial='welcome']", position: "bottom" },
  balance: { selector: "[data-tutorial='balance']", position: "bottom" },
  income: { selector: "[data-tutorial='income']", position: "bottom" },
  expenses: { selector: "[data-tutorial='expenses']", position: "bottom" },
  charts: { selector: "[data-tutorial='charts']", position: "top" },
  score: { selector: "[data-tutorial='score']", position: "left" },
  insights: { selector: "[data-tutorial='insights']", position: "top" },
  // Income
  incomePage: { selector: "[data-tutorial='page']", position: "center" },
  incomeAdd: { selector: "[data-tutorial='add-button']", position: "bottom" },
  incomeTable: { selector: "[data-tutorial='main']", position: "top" },
  // Expenses
  expensesPage: { selector: "[data-tutorial='page']", position: "center" },
  expensesAdd: { selector: "[data-tutorial='add-button']", position: "bottom" },
  expensesTable: { selector: "[data-tutorial='main']", position: "top" },
  // Budgets
  budgetsPage: { selector: "[data-tutorial='page']", position: "center" },
  budgetsAdd: { selector: "[data-tutorial='add-button']", position: "bottom" },
  budgetsGrid: { selector: "[data-tutorial='main']", position: "top" },
  // Goals
  goalsPage: { selector: "[data-tutorial='page']", position: "center" },
  goalsAdd: { selector: "[data-tutorial='add-button']", position: "bottom" },
  goalsGrid: { selector: "[data-tutorial='main']", position: "top" },
  // Subscriptions
  subscriptionsPage: { selector: "[data-tutorial='page']", position: "center" },
  subscriptionsAdd: { selector: "[data-tutorial='add-button']", position: "bottom" },
  subscriptionsTable: { selector: "[data-tutorial='main']", position: "top" },
  // Insights page
  insightsFull: { selector: "[data-tutorial='page']", position: "center" },
  insightsAll: { selector: "[data-tutorial='main']", position: "top" },
  // Reports
  reportsPage: { selector: "[data-tutorial='page']", position: "center" },
  reportsTable: { selector: "[data-tutorial='main']", position: "top" },
  // Settings
  settingsProfile: { selector: "[data-tutorial='profile']", position: "right" },
  settingsCurrency: { selector: "[data-tutorial='currency']", position: "right" },
  settingsAppearance: { selector: "[data-tutorial='appearance']", position: "right" },
  settingsLanguage: { selector: "[data-tutorial='language']", position: "right" },
  settingsHelp: { selector: "[data-tutorial='help']", position: "right" },
  // Done
  done: { selector: "body", position: "center" },
};

function StepBody({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h3>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/** Core brain: reads the tutorial store, navigates between pages, drives Reactour. */
function TutorialController() {
  const t = useTranslations("tutorial");
  const pathname = usePathname();
  const router = useRouter();

  const { setIsOpen, setSteps, setCurrentStep, isOpen, currentStep, steps } = useTour();

  const running = useTutorialStore((s) => s.running);
  const section = useTutorialStore((s) => s.section);
  const isFullTour = useTutorialStore((s) => s.isFullTour);
  const start = useTutorialStore((s) => s.start);
  const advance = useTutorialStore((s) => s.advance);
  const stop = useTutorialStore((s) => s.stop);

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const profile = useFinanceStore((s) => s.profile);
  const financeHydrated = useFinanceStore((s) => s.hydrated);

  const pollRef = React.useRef<number | null>(null);
  const prevOpenRef = React.useRef(false);
  // Latch: auto-launch fires at most once per mount of the (app) layout.
  // Prevents re-triggering after a section replay, a Firestore-persist race,
  // or a same-route click like the sidebar "Resumen" link.
  const didAutoStartRef = React.useRef(false);

  const hasCompleted = React.useMemo(() => {
    // Version-based: only counts as done if the profile (or cookie) matches
    // the *current* TUTORIAL_VERSION. Existing users with the old boolean flag
    // but no version number are re-onboarded automatically.
    if (profile?.tutorialVersion === TUTORIAL_VERSION) return true;
    if (
      typeof window !== "undefined" &&
      getCookie(COOKIE_KEYS.onboarding) === String(TUTORIAL_VERSION)
    ) {
      return true;
    }
    return false;
  }, [profile?.tutorialVersion]);

  // Auto-launch the full tour the first time a signed-in user lands on /dashboard.
  React.useEffect(() => {
    if (didAutoStartRef.current) return;
    if (pathname !== "/dashboard") return;
    if (authLoading || !user) return;
    if (running || isOpen) return;
    if (!financeHydrated) return;
    if (hasCompleted) return;
    didAutoStartRef.current = true;
    const id = window.setTimeout(() => start("full"), 900);
    return () => window.clearTimeout(id);
  }, [pathname, authLoading, user, running, isOpen, financeHydrated, hasCompleted, start]);

  const buildSteps = React.useCallback(
    (stepKeys: string[]): StepType[] => {
      const steps: StepType[] = [];
      for (const key of stepKeys) {
        const cfg = STEP_TARGETS[key];
        if (!cfg) continue;
        const exists =
          cfg.selector === "body" || !!document.querySelector(cfg.selector);
        if (!exists) continue;
        steps.push({
          selector: cfg.selector,
          position: cfg.position,
          content: <StepBody title={t(`steps.${key}.title`)} body={t(`steps.${key}.body`)} />,
        });
      }
      return steps;
    },
    [t]
  );

  // React to section changes: navigate + open tour once DOM is ready.
  React.useEffect(() => {
    if (!running || !section) {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const cfg = SECTIONS[section];
    if (!cfg) return;

    // Need to navigate first? The effect will re-run after pathname updates.
    if (pathname !== cfg.route) {
      router.push(cfg.route);
      return;
    }

    // On the right page — poll for targets (they may not be mounted yet).
    let attempts = 0;
    if (pollRef.current !== null) window.clearInterval(pollRef.current);

    const tryOpen = () => {
      attempts += 1;
      const steps = buildSteps(cfg.stepKeys);
      if (steps.length > 0) {
        if (pollRef.current !== null) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setSteps?.(steps);
        setCurrentStep(0);
        setIsOpen(true);
      } else if (attempts >= 25) {
        // ~3.75s — give up on this section and move on.
        if (pollRef.current !== null) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        advance();
      }
    };

    tryOpen();
    pollRef.current = window.setInterval(tryOpen, 150);

    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [running, section, pathname, router, buildSteps, setSteps, setCurrentStep, setIsOpen, advance]);

  // Sub-tour closed → move to next in queue (or stop).
  React.useEffect(() => {
    if (prevOpenRef.current && !isOpen && running) {
      advance();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, running, advance]);

  // When a close stops the entire tour (queue drained), make sure isOpen is false.
  React.useEffect(() => {
    if (!running && isOpen) setIsOpen(false);
  }, [running, isOpen, setIsOpen]);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  // While the tour is running we freeze page scroll so users can't drift away
  // from the highlighted element. We keep html/body untouched when the tour
  // ends to avoid fighting other lock sources (Radix dialog, etc.).
  React.useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const prevHtml = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [isOpen]);

  // ── Autoscroll to the current step's target ───────────────────────────────
  // Reactour's built-in `scrollSmooth` only triggers on open; it misses same-tour
  // step transitions when the target is offscreen. We complement it with a
  // manual scrollIntoView on every step change. A short delay lets the popover
  // finish its own positioning first so the browser doesn't clip our scroll.
  React.useEffect(() => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (!step || typeof step.selector !== "string") return;
    if (step.selector === "body") return;
    const el = document.querySelector(step.selector);
    if (!(el instanceof HTMLElement)) return;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [isOpen, currentStep, steps]);

  // Expose nothing. Listening only.
  // (kept isFullTour dependency silent — store handles its own persistence.)
  void isFullTour;

  return null;
}

/**
 * Root tutorial wrapper. Lives in the (app) layout so every page that might
 * take part in the tour has the provider in its tree.
 */
export function DashboardTutorial({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const stop = useTutorialStore((s) => s.stop);

  return (
    <TourProvider
      steps={[]}
      padding={{ mask: 6, popover: 14 }}
      // Lock interaction with the highlighted element while the tour is open —
      // keeps the user focused on the guide (popover buttons still work because
      // they live outside the mask).
      disableInteraction
      // Clicking the darkened backdrop should NOT close the tour: too easy to
      // dismiss by accident and lose progress.
      disableDotsNavigation
      disableKeyboardNavigation={false}
      showBadge
      scrollSmooth
      showCloseButton
      onClickMask={() => {
        /* noop — prevent backdrop click from closing the tour */
      }}
      // Default next-button clamps at the last step — we override so that
      // pressing next on the last step closes the popover, which lets our
      // `advance()` detector move the queue forward.
      nextButton={({ Button, currentStep, stepsLength, setIsOpen }) => {
        const isLast = currentStep === stepsLength - 1;
        return (
          <Button
            kind="next"
            onClick={
              isLast
                ? () => {
                    setIsOpen(false);
                  }
                : undefined
            }
          />
        );
      }}
      onClickClose={({ setIsOpen: close, setCurrentStep }) => {
        // Hard-stop: user explicitly quit the tour via the X button.
        stop();
        setCurrentStep?.(0);
        close?.(false);
      }}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: isDark ? "#0b1412" : "#ffffff",
          color: isDark ? "#e5f3ea" : "#0f172a",
          borderRadius: 14,
          padding: 18,
          boxShadow: isDark
            ? "0 20px 40px -12px rgba(0,0,0,0.6)"
            : "0 20px 40px -12px rgba(2, 31, 20, 0.25)",
          maxWidth: 380,
        }),
        maskArea: (base) => ({
          ...base,
          rx: 12,
          // Bright ring around the spotlight so the active element reads clearly
          // even against the stronger backdrop below.
          stroke: "#1ec47f",
          strokeWidth: 2,
        }),
        maskWrapper: (base) => ({
          ...base,
          // Stronger black-tinted overlay. The previous greenish 0.55 blended
          // too much into the app's brand palette, making the backdrop feel soft.
          color: isDark ? "rgba(0, 0, 0, 0.82)" : "rgba(3, 20, 14, 0.72)",
        }),
        badge: (base) => ({
          ...base,
          backgroundColor: "#1ec47f",
          color: "#ffffff",
          fontSize: 11,
        }),
        controls: (base) => ({ ...base, marginTop: 14 }),
        close: (base) => ({ ...base, color: isDark ? "#94a3b8" : "#64748b" }),
      }}
    >
      {children}
      <TutorialController />
    </TourProvider>
  );
}
