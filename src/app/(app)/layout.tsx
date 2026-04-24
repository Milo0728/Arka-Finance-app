"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { QuickAddDialog } from "@/components/dashboard/quick-add-dialog";
import { DashboardTutorial } from "@/components/dashboard/tutorial/dashboard-tutorial";
import { ChangelogModal } from "@/components/dashboard/changelog-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useChangelogStore } from "@/store/useChangelogStore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { APP_VERSION, LAST_SEEN_VERSION_KEY } from "@/lib/version";
import { getChangelog } from "@/lib/changelog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [rehydrated, setRehydrated] = React.useState(false);
  const hydrateSeed = useFinanceStore((s) => s.hydrateSeed);
  const hydrated = useFinanceStore((s) => s.hydrated);
  const loadRates = useFinanceStore((s) => s.loadRates);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  React.useEffect(() => {
    const unsub = useFinanceStore.persist.onFinishHydration(() => setRehydrated(true));
    if (useFinanceStore.persist.hasHydrated()) {
      setRehydrated(true);
    } else {
      Promise.resolve(useFinanceStore.persist.rehydrate()).catch(() => {
        setRehydrated(true);
      });
    }
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!rehydrated || hydrated) return;
    // When Firebase is configured, the auth listener's bootstrap() fills the
    // store from Firestore. Only fall back to the local seed in demo mode, or
    // once auth has confirmed there is no user.
    if (isFirebaseConfigured && (authLoading || user)) return;
    hydrateSeed();
  }, [rehydrated, hydrated, hydrateSeed, user, authLoading]);

  React.useEffect(() => {
    if (rehydrated) loadRates();
  }, [rehydrated, loadRates]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      setQuickAdd(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-open the changelog modal when the user lands on an app page for the
  // first time after a version bump. Runs once per mount and ONLY on the
  // client — we read localStorage lazily inside the effect so SSR stays
  // clean and hydration isn't affected. Silent when there's no changelog
  // entry for the current version (handled inside the modal too, belt-and-
  // suspenders). A tiny delay prevents the modal from flashing at the same
  // instant as the dashboard tutorial — the UX reads better with one thing
  // demanding attention at a time.
  const openChangelog = useChangelogStore((s) => s.open);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getChangelog(APP_VERSION)) return;
    let lastSeen: string | null = null;
    try {
      lastSeen = window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
    } catch {
      // Incognito / quota errors — fall through and show the modal; the
      // user can still dismiss it, we just can't remember they did.
    }
    if (lastSeen === APP_VERSION) return;
    const id = window.setTimeout(() => openChangelog(), 800);
    return () => window.clearTimeout(id);
  }, [openChangelog]);

  return (
    <DashboardTutorial>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <DashboardHeader onQuickAdd={() => setQuickAdd(true)} />
          {/* Extra bottom padding on mobile so the FAB doesn't cover content */}
          <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:pb-6 lg:px-8 lg:py-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
        {/* Floating action button — only shown where the header Quick Add
            button is hidden (mobile). Keeps "add transaction" one tap away. */}
        <Button
          onClick={() => setQuickAdd(true)}
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-xl sm:hidden"
          aria-label="Quick add"
        >
          <Plus className="h-6 w-6" />
        </Button>
        <QuickAddDialog open={quickAdd} onOpenChange={setQuickAdd} />
        {/* Release-notes modal. Always mounted — open state lives in its
            own store so both the auto-opener above and the sidebar badge
            can control it without prop drilling. */}
        <ChangelogModal />
      </div>
    </DashboardTutorial>
  );
}
