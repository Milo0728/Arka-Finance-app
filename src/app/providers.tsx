"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { useAuthListener } from "@/hooks/useAuth";

function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthListener();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="user_theme"
      >
        <TooltipProvider delayDuration={120}>
          <AuthGate>{children}</AuthGate>
          <CookieConsent />
        </TooltipProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
