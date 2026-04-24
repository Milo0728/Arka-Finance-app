"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, LAST_SEEN_VERSION_KEY } from "@/lib/version";
import { getChangelog } from "@/lib/changelog";
import { useChangelogStore } from "@/store/useChangelogStore";

/**
 * "What's new" modal. Renders patch notes for `APP_VERSION`. Shown:
 *   - automatically, the first time a user lands on the app after a version
 *     bump (controlled by the auto-opener in the app layout);
 *   - manually, any time the sidebar badge is clicked.
 *
 * Closing always writes the current version into localStorage so the auto-
 * opener stays quiet until the next bump. Uses `sessionStorage`? No —
 * localStorage, because we want the "I've seen this" bit to persist across
 * sessions, not just within one.
 */
export function ChangelogModal() {
  const isOpen = useChangelogStore((s) => s.isOpen);
  const close = useChangelogStore((s) => s.close);
  const t = useTranslations("changelog");

  const entry = React.useMemo(() => getChangelog(APP_VERSION), []);

  function markAsSeenAndClose() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
      } catch {
        /* localStorage quota / incognito — silently ignore, the worst case
           is the user sees the modal again on next visit. */
      }
    }
    close();
  }

  // No changelog entry for this version → modal is a no-op. We still handle
  // the open/close cycle so the badge click doesn't appear broken; we just
  // render a minimal "nothing to show" body.
  const safeEntry =
    entry ?? {
      title: t("fallbackTitle"),
      sections: [],
    };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) markAsSeenAndClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{safeEntry.title}</span>
              </DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </div>
            <Badge variant="muted" className="shrink-0 text-[10px]">
              v{APP_VERSION}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scroll area caps the visible height so long changelogs don't push
            the confirm button off-screen on short viewports. */}
        <div className="-mx-6 max-h-[60vh] overflow-y-auto px-6">
          {safeEntry.sections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("fallbackBody")}
            </p>
          ) : (
            <div className="space-y-5 py-1">
              {safeEntry.sections.map((section, idx) => (
                <section key={idx} className="space-y-2">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span
                          aria-hidden
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
                        />
                        <span className="min-w-0 flex-1 break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={markAsSeenAndClose}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
