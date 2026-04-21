"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: React.ReactNode;
  fallback?: (reset: () => void, error: Error | null) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[Arka ErrorBoundary]", error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.reset, this.state.error);
      return <DefaultFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center p-6">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">Something went wrong</CardTitle>
          </div>
          <CardDescription>
            A part of the interface ran into an error. Your data is safe — try again or reload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload page
            </Button>
            <Button size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4" />
              <span className="ml-1">Try again</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
