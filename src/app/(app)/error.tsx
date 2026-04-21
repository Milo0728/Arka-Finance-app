"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-6">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">Something broke on this page</CardTitle>
          </div>
          <CardDescription>
            The rest of your workspace still works. Retry this view or reload the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload
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
