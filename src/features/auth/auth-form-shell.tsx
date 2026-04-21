import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthFormShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthFormShell({ title, description, children, footer }: AuthFormShellProps) {
  return (
    <Card className="border-border/80 shadow-xl">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {footer && <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground">{footer}</div>}
    </Card>
  );
}
