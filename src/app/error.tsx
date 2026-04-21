"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[Arka] Global error", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">An unexpected error occurred</CardTitle>
          </div>
          <CardDescription>
            Arka hit a snag while rendering this page. Your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Go home</Link>
            </Button>
            <Button size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              <span className="ml-1">Try again</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
