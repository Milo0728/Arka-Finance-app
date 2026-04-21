"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? (theme === "system" ? resolvedTheme : theme) : undefined;
  const isDark = current === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    Cookies.set("user_theme", next, { expires: 365, sameSite: "lax" });
  }

  // Render a stable structure from the start to avoid removeChild hydration errors.
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      aria-label="Toggle theme"
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground"
      suppressHydrationWarning
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Sun
          className={cn(
            "absolute h-4 w-4 transition-opacity duration-150",
            mounted && isDark ? "opacity-100" : "opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 transition-opacity duration-150",
            mounted && !isDark ? "opacity-100" : "opacity-0"
          )}
        />
      </span>
      {!compact && (
        <span className="ml-2 text-sm" suppressHydrationWarning>
          {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
        </span>
      )}
    </Button>
  );
}
