"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Wraps auth-only routes (login/register/reset). If the auth listener has
 * already confirmed a signed-in user, redirect to the dashboard and stop
 * rendering the form so we don't flash it briefly.
 */
export function RedirectIfAuthed({
  children,
  to = "/dashboard",
}: {
  children: React.ReactNode;
  to?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  React.useEffect(() => {
    if (!loading && user) router.replace(to);
  }, [loading, user, router, to]);

  if (!loading && user) return null;
  return <>{children}</>;
}
