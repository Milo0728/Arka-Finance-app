import Link from "next/link";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("desc")}</p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">{t("landing")}</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">{t("dashboard")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
