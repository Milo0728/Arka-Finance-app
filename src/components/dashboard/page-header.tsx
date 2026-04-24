import * as React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    // Mobile stacks the title block above the actions so both get full width.
    // From sm+ we switch to a row with the actions hugging the right edge.
    // `flex-wrap` on sm keeps multi-item action groups from clipping when they
    // can't fit alongside the title.
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      {/* w-full on mobile + min-w-0 on sm+ so the title block always has the
          full row on narrow screens, and truncates instead of pushing actions
          off-screen when there's a row to share. */}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
