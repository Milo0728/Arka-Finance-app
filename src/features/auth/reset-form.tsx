"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AuthFormShell } from "./auth-form-shell";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ResetValues = z.infer<typeof schema>;

export function ResetForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ResetValues) {
    if (!isFirebaseConfigured) {
      toast.info("Demo mode", { description: "Configure Firebase to enable password reset emails." });
      return;
    }
    try {
      await resetPassword(values.email);
      toast.success("Check your inbox", { description: "We sent you a reset link." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    }
  }

  return (
    <AuthFormShell
      title="Reset your password"
      description="Enter the email on file and we'll send a secure reset link."
      footer={
        <>
          Remembered?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthFormShell>
  );
}
