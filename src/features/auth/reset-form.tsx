"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AuthFormShell } from "./auth-form-shell";

type ResetValues = { email: string };

export function ResetForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const schema = React.useMemo(
    () => z.object({ email: z.string().email(t("zod.email")) }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ResetValues) {
    if (!isFirebaseConfigured) {
      toast.info(tCommon("demoMode"), { description: t("toasts.demoReset") });
      return;
    }
    try {
      await resetPassword(values.email);
      toast.success(t("toasts.resetSent"), { description: t("toasts.resetSentDesc") });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.resetFailed"));
    }
  }

  return (
    <AuthFormShell
      title={t("reset")}
      description={t("resetDesc")}
      footer={
        <>
          {t("rememberedQ")}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t("backToSignIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("sendResetLink")}
        </Button>
      </form>
    </AuthFormShell>
  );
}
