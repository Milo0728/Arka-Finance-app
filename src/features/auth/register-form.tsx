"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AuthFormShell } from "./auth-form-shell";
import { ProviderButtons } from "./provider-buttons";

const schema = z.object({
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type RegisterValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: RegisterValues) {
    if (!isFirebaseConfigured) {
      toast.info("Demo mode", {
        description: "Add Firebase env vars to persist your account — exploring the demo for now.",
      });
      router.push("/dashboard");
      return;
    }
    try {
      await registerWithEmail(values.name, values.email, values.password);
      toast.success("Welcome to Arka", { description: "Your account is ready." });
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create account");
    }
  }

  return (
    <AuthFormShell
      title="Create your Arka"
      description="Start building wealth with Babylonian wisdom."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ProviderButtons />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or with email</span>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Arkad Babylonian" autoComplete="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
        <p className="text-xs text-muted-foreground">
          By creating an account you agree to our friendly{" "}
          <Link href="/" className="underline">Terms</Link> and{" "}
          <Link href="/" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </AuthFormShell>
  );
}
