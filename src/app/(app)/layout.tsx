"use client";

import * as React from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { QuickAddDialog } from "@/components/dashboard/quick-add-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { useFinanceStore } from "@/store/useFinanceStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [rehydrated, setRehydrated] = React.useState(false);
  const hydrateSeed = useFinanceStore((s) => s.hydrateSeed);
  const hydrated = useFinanceStore((s) => s.hydrated);
  const loadRates = useFinanceStore((s) => s.loadRates);

  React.useEffect(() => {
    useFinanceStore.persist.rehydrate()?.finally(() => setRehydrated(true));
  }, []);

  React.useEffect(() => {
    if (rehydrated && !hydrated) hydrateSeed();
  }, [rehydrated, hydrated, hydrateSeed]);

  React.useEffect(() => {
    if (rehydrated) loadRates();
  }, [rehydrated, loadRates]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickAdd(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
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
  );
}
