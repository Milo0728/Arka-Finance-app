"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { parseQuickAdd, type ParsedQuickAdd } from "@/lib/quick-add-parser";

interface QuickParseInputProps {
  /** Called when the user presses "Parse" or hits Enter on the box. */
  onApply: (parsed: ParsedQuickAdd) => void;
  /** Lets call sites translate the matched category label (expense vs income). */
  resolveLabel: (parsed: ParsedQuickAdd) => string | null;
  placeholder?: string;
}

/**
 * Inline quick-parse box reused across the regular Expense / Income forms and
 * the Quick Add dialog. Keeps the parser UX consistent and means future
 * improvements (e.g. multi-transaction batch) only need to land here.
 */
export function QuickParseInput({ onApply, resolveLabel, placeholder }: QuickParseInputProps) {
  const t = useTranslations("quickAdd.parser");
  const tQuickAdd = useTranslations("quickAdd");
  const enabled = isFeatureEnabled("quickAddPro");
  const [value, setValue] = React.useState("");
  const [hint, setHint] = React.useState<string | null>(null);

  if (!enabled) return null;

  function apply() {
    const result = parseQuickAdd(value);
    onApply(result);
    const label = resolveLabel(result);
    setHint(label ? t("matched", { category: label }) : t("noMatch"));
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" /> {t("label")}
      </Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? tQuickAdd("parser.placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={apply}>
          {t("apply")}
        </Button>
      </div>
      {hint && (
        <Badge variant="outline" className="text-[10px]">
          {hint}
        </Badge>
      )}
    </div>
  );
}
