"use client";

import * as React from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { QuickAddDialog } from "@/components/dashboard/quick-add-dialog";
import { DashboardTutorial } from "@/components/dashboard/tutorial/dashboard-tutorial";
import { ErrorBoundary } from "@/components/error-boundary";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { isFirebaseConfigured } from "@/lib/firebase";

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

  return (
    <DashboardTutorial>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <DashboardHeader onQuickAdd={() => setQuickAdd(true)} />
          <main className="flex-1 overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
        <QuickAddDialog open={quickAdd} onOpenChange={setQuickAdd} />
      </div>
    </DashboardTutorial>
  );
}
