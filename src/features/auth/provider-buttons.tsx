"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { loginWithGoogle } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.8h5.3c-.23 1.38-1.65 4.05-5.3 4.05-3.2 0-5.8-2.65-5.8-5.9S8.8 6.25 12 6.25c1.82 0 3.04.77 3.74 1.44l2.54-2.45C16.7 3.77 14.5 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12S6.92 21.2 12 21.2c6.92 0 9.2-4.85 9.2-7.37 0-.5-.05-.86-.13-1.23H12z"
      />
    </svg>
  );
}

export function ProviderButtons() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = React.useState(false);

  async function handleGoogle() {
    if (!isFirebaseConfigured) {
      toast.info(tCommon("demoMode"), { description: t("toasts.demoGoogle") });
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success(t("toasts.welcomeArka"));
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("toasts.signInFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" type="button" onClick={handleGoogle} disabled={loading} className="w-full">
      <GoogleIcon />
      <span className="ml-2">{t("continueGoogle")}</span>
    </Button>
  );
}
