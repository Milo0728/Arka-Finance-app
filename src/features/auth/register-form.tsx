"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AuthFormShell } from "./auth-form-shell";
import { ProviderButtons } from "./provider-buttons";

type RegisterValues = { name: string; email: string; password: string };

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, t("zod.name")),
        email: z.string().email(t("zod.email")),
        password: z.string().min(8, t("zod.passwordRegister")),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: RegisterValues) {
    if (!isFirebaseConfigured) {
      toast.info(tCommon("demoMode"), { description: t("toasts.demoRegister") });
      router.push("/dashboard");
      return;
    }
    try {
      await registerWithEmail(values.name, values.email, values.password);
      toast.success(t("toasts.createdToast"), { description: t("toasts.ready") });
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.signUpFailed"));
    }
  }

  return (
    <AuthFormShell
      title={t("createArka")}
      description={t("createArkaDesc")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t("signInButton")}
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
          <Label htmlFor="name">{t("fullName")}</Label>
          <Input id="name" placeholder={t("namePlaceholder")} autoComplete="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
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
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("registerPasswordPlaceholder")}
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("createAccount")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("termsAgree")}{" "}
          <Link href="/" className="underline">
            {t("terms")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href="/" className="underline">
            {t("privacy")}
          </Link>
          .
        </p>
      </form>
    </AuthFormShell>
  );
}
