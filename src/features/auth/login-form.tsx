"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AuthFormShell } from "./auth-form-shell";
import { ProviderButtons } from "./provider-buttons";

type LoginValues = { email: string; password: string };

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [showPassword, setShowPassword] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z.object({
        email: z.string().email(t("zod.email")),
        password: z.string().min(6, t("zod.passwordLogin")),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginValues) {
    if (!isFirebaseConfigured) {
      toast.info(tCommon("demoMode"), { description: t("toasts.demoLogin") });
      router.push("/dashboard");
      return;
    }
    try {
      await loginWithEmail(values.email, values.password);
      toast.success(t("toasts.welcomeToast"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.signInFailed"));
    }
  }

  return (
    <AuthFormShell
      title={t("welcomeBack")}
      description={t("welcomeBackDesc")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            {t("createOne")}
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
          <span className="bg-card px-2 text-muted-foreground">{t("orEmail")}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link href="/reset" className="text-xs text-muted-foreground hover:text-foreground">
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("signInButton")}
        </Button>
      </form>
    </AuthFormShell>
  );
}
