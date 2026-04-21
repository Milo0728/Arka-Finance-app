"use client";

import * as React from "react";
import { Cookie, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COOKIE_KEYS, getCookie, setCookie } from "@/lib/preferences";

export function CookieConsent() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const saved = getCookie(COOKIE_KEYS.consent);
    if (!saved) setVisible(true);
  }, []);

  function decide(choice: "accepted" | "declined") {
    setCookie(COOKIE_KEYS.consent, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <Card className="pointer-events-auto flex w-full max-w-xl items-start gap-4 border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("body")}</p>
            </div>
            <button
              onClick={() => decide("declined")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => decide("accepted")}>
              {t("accept")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("declined")}>
              {t("decline")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
