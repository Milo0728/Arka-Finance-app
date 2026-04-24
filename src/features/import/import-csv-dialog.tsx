"use client";

import * as React from "react";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  AlertCircle,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useMoney } from "@/hooks/useMoney";
import { downloadCSV } from "@/utils/export";
import {
  detectMapping,
  normalizeAmount,
  normalizeCategory,
  normalizeDate,
  normalizeType,
  type CanonicalField,
} from "@/utils/csv-mapping";
import {
  ACCEPT_SPREADSHEET,
  readSpreadsheet,
  type SpreadsheetData,
} from "@/utils/spreadsheet-import";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INCOME_CATEGORY_VALUES } from "@/lib/categories";
import type { Expense, Income, IncomeCategory } from "@/types";

type ImportMode = "expense" | "income";

/** Sample rows shown in the format block AND used as the downloadable template. */
const SAMPLE_CSV = [
  "date,amount,description,category,type",
  "2026-04-23,20000,Almuerzo,food,variable",
  "2026-04-22,1400,Renta,housing,fixed",
  "2026-04-20,15.99,Netflix,subscriptions,fixed",
].join("\n");

/** Sentinel used by the column-role dropdowns to mean "don't import this column". */
const ROLE_IGNORE = "__ignore__";

/** How the user has tagged each column from their file. */
type ColumnRole = CanonicalField | typeof ROLE_IGNORE;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow {
  ok: boolean;
  reason?: string;
  /** Draft is the expense draft in expense mode, income draft in income mode.
   *  We narrow it at the call site via the active `mode`. */
  draft: Omit<Expense, "id"> | Omit<Income, "id">;
  /** Original row values keyed by header — kept for the spreadsheet view. */
  raw: Record<string, string>;
}

function coerceIncomeCategory(raw: string | undefined): IncomeCategory {
  const v = (raw ?? "").trim().toLowerCase();
  return (INCOME_CATEGORY_VALUES as string[]).includes(v) ? (v as IncomeCategory) : "other";
}

const PREVIEW_ROW_LIMIT = 20;

export function ImportCsvDialog({ open, onOpenChange }: Props) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const profile = useFinanceStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.uid ?? profile?.id ?? "demo-user";
  const money = useMoney();
  const t = useTranslations("import");

  const [mode, setMode] = React.useState<ImportMode>("expense");
  const [data, setData] = React.useState<SpreadsheetData | null>(null);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  /** Per-column role chosen by the user (initially auto-detected). */
  const [roles, setRoles] = React.useState<Record<string, ColumnRole>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setData(null);
    setFilename(null);
    setRoles({});
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const parsed = await readSpreadsheet(file);
      if (parsed.rows.length === 0 || parsed.headers.length === 0) {
        toast.error(t("toasts.empty"));
        return;
      }
      setData(parsed);
      setFilename(file.name);
      // Pre-fill column roles from the auto-detected mapping. Anything not
      // mapped automatically starts as "ignore" — the user can promote it.
      const auto = detectMapping(parsed.headers);
      const initial: Record<string, ColumnRole> = {};
      for (const h of parsed.headers) initial[h] = ROLE_IGNORE;
      (Object.keys(auto) as CanonicalField[]).forEach((field) => {
        const header = auto[field];
        if (header) initial[header] = field;
      });
      setRoles(initial);
    } catch (err) {
      toast.error(t("toasts.readFailed"));
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[Arka] spreadsheet read failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }

  /** Build the canonical-field → header map from the per-column roles. */
  const mapping = React.useMemo(() => {
    const result: Partial<Record<CanonicalField, string>> = {};
    for (const [header, role] of Object.entries(roles)) {
      if (role === ROLE_IGNORE) continue;
      // If two columns claim the same role, the LAST one wins. The UI flags
      // the earlier ones with a warning so users know to fix it.
      result[role] = header;
    }
    return result;
  }, [roles]);

  /** Headers that share their role with another header — surfaced as a warning. */
  const duplicateHeaders = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const role of Object.values(roles)) {
      if (role === ROLE_IGNORE) continue;
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return new Set(
      Object.entries(roles)
        .filter(([, role]) => role !== ROLE_IGNORE && (counts.get(role) ?? 0) > 1)
        .map(([h]) => h)
    );
  }, [roles]);

  /** Live preview — recomputed every time the user changes a role. */
  const preview = React.useMemo<PreviewRow[]>(() => {
    if (!data) return [];
    const dateCol = mapping.date;
    const amountCol = mapping.amount;
    const descriptionCol = mapping.description;
    const categoryCol = mapping.category;
    const typeCol = mapping.type;

    return data.rows.map((record) => {
      const rawAmount = amountCol ? record[amountCol] : undefined;
      const rawDate = dateCol ? record[dateCol] : undefined;
      const rawDescription = descriptionCol ? record[descriptionCol] : undefined;
      const rawCategory = categoryCol ? record[categoryCol] : undefined;
      const rawType = typeCol ? record[typeCol] : undefined;

      const amount = normalizeAmount(rawAmount ?? "");
      const date = normalizeDate(rawDate ?? "");
      const description = (rawDescription ?? "").trim();

      // Category fallback: explicit value → quick-add inference → "other".
      let category = normalizeCategory(rawCategory);
      if (!rawCategory && description) {
        const guess = parseQuickAdd(description).category;
        if (guess) category = guess;
      }

      let ok = true;
      let reason: string | undefined;
      if (!date) {
        ok = false;
        reason = t("rowReasons.missingDate");
      } else if (amount === null || amount <= 0) {
        ok = false;
        reason = t("rowReasons.invalidAmount");
      }

      // Build the right shape depending on the active mode. Expenses carry
      // `type`, incomes don't. Category enums are distinct.
      const draft = mode === "expense"
        ? {
            userId,
            amount: ok && amount !== null ? money.toUSD(amount) : 0,
            date: date ?? "",
            description,
            category,
            type: normalizeType(rawType),
          }
        : {
            userId,
            amount: ok && amount !== null ? money.toUSD(amount) : 0,
            date: date ?? "",
            description,
            category: coerceIncomeCategory(rawCategory),
          };
      return {
        ok,
        reason,
        raw: record,
        draft,
      };
    });
  }, [data, mapping, money, t, userId, mode]);

  const validCount = preview.filter((r) => r.ok).length;
  const invalidCount = preview.length - validCount;
  const canImport = validCount > 0 && !!mapping.date && !!mapping.amount;

  async function confirmImport() {
    const valid = preview.filter((r) => r.ok);
    if (valid.length === 0) {
      toast.error(t("toasts.nothingValid"));
      return;
    }
    setSubmitting(true);
    try {
      for (const r of valid) {
        if (mode === "expense") {
          await addExpense(r.draft as Omit<Expense, "id">);
        } else {
          await addIncome(r.draft as Omit<Income, "id">);
        }
      }
      toast.success(t("toasts.imported", { count: valid.length }));
      onOpenChange(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  function setRole(header: string, role: ColumnRole) {
    setRoles((prev) => ({ ...prev, [header]: role }));
  }

  // ── Role label & color helpers — used by the column header chip and the
  //    spreadsheet cell tinting so mapping state is visible at a glance.
  const roleLabel = (role: ColumnRole) => {
    if (role === ROLE_IGNORE) return t("roles.ignore");
    return t(`roles.${role}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Import mode — switching mid-flow resets file state to avoid
            reusing an expense mapping against income data and vice versa. */}
        <Tabs
          value={mode}
          onValueChange={(v) => {
            const next = v as ImportMode;
            if (next !== mode) {
              setMode(next);
              // Reset the uploaded file: Income/Expense categories & shape
              // differ, re-picking the file forces a clean mapping pass.
              setData(null);
              setFilename(null);
              setRoles({});
              if (inputRef.current) inputRef.current.value = "";
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">{t("tabs.expense")}</TabsTrigger>
            <TabsTrigger value="income">{t("tabs.income")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {/* ── Step 1: pick a file ─────────────────────────────────────── */}
          {!data && (
            <>
              <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("expected")}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => downloadCSV("arka-sample-expenses.csv", SAMPLE_CSV)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="ml-1 text-xs">{t("downloadSample")}</span>
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-background/60 p-2 text-[11px] leading-relaxed">
                  {SAMPLE_CSV}
                </pre>
                <p className="text-[11px] text-muted-foreground">{t("formatFlex")}</p>
                <p className="text-[11px] text-muted-foreground">{t("supportsFiles")}</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT_SPREADSHEET}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="ml-1">{t("pickFile")}</span>
                </Button>
                <span className="text-[11px] text-muted-foreground">{t("acceptHint")}</span>
              </div>
            </>
          )}

          {/* ── Step 2: spreadsheet preview with column-role mapping ──── */}
          {data && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{filename}</span>
                  <Badge variant="muted" className="text-[10px] uppercase">
                    {data.source}
                  </Badge>
                  <Badge variant="muted" className="text-[10px]">
                    {t("rowCount", { count: data.rows.length })}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="success">{t("validCount", { count: validCount })}</Badge>
                  {invalidCount > 0 && (
                    <Badge variant="warning">{t("invalidCount", { count: invalidCount })}</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      reset();
                      // After reset the file input opens again on click, but we
                      // also expose the original picker for clarity.
                      window.setTimeout(() => inputRef.current?.click(), 50);
                    }}
                  >
                    {t("changeFile")}
                  </Button>
                </div>
              </div>

              {(!mapping.date || !mapping.amount) && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p>{t("requireDateAmount")}</p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      {/* Column-role row: a dropdown above each header so users
                          can label what each column actually means. Updates the
                          preview live (filtered counts + per-row status). */}
                      <tr>
                        <th className="w-10 p-1.5 text-left text-muted-foreground"></th>
                        {data.headers.map((h) => {
                          const role = roles[h] ?? ROLE_IGNORE;
                          const dup = duplicateHeaders.has(h);
                          return (
                            <th key={h} className="min-w-[150px] p-1.5 align-top">
                              <Select value={role} onValueChange={(v) => setRole(h, v as ColumnRole)}>
                                <SelectTrigger
                                  className={cn(
                                    "h-7 text-[11px]",
                                    role !== ROLE_IGNORE && "border-primary/40 bg-primary/5",
                                    dup && "border-warning/60 bg-warning/10"
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={ROLE_IGNORE}>{t("roles.ignore")}</SelectItem>
                                  <SelectItem value="date">{t("roles.date")}</SelectItem>
                                  <SelectItem value="amount">{t("roles.amount")}</SelectItem>
                                  <SelectItem value="description">{t("roles.description")}</SelectItem>
                                  <SelectItem value="category">{t("roles.category")}</SelectItem>
                                  <SelectItem value="type">{t("roles.type")}</SelectItem>
                                </SelectContent>
                              </Select>
                              {dup && (
                                <p className="mt-1 text-[10px] text-warning">{t("dupRole")}</p>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                      {/* Original header row from the file itself. */}
                      <tr className="border-t">
                        <th className="w-10 p-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                          #
                        </th>
                        {data.headers.map((h) => (
                          <th key={h} className="p-2 text-left font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, idx) => {
                        const status = preview[idx];
                        const rowOk = status?.ok ?? true;
                        return (
                          <tr
                            key={idx}
                            className={cn(
                              "border-t",
                              !rowOk && "bg-destructive/5",
                              rowOk && idx % 2 === 1 && "bg-muted/20"
                            )}
                          >
                            <td className="p-2 text-[10px] text-muted-foreground">
                              {rowOk ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-success">
                                      <CheckCircle2 className="h-3 w-3" /> {idx + 1}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{t("ok")}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-destructive">
                                      <AlertCircle className="h-3 w-3" /> {idx + 1}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{status?.reason}</TooltipContent>
                                </Tooltip>
                              )}
                            </td>
                            {data.headers.map((h) => {
                              const role = roles[h] ?? ROLE_IGNORE;
                              const cellValue = row[h] ?? "";
                              return (
                                <td
                                  key={h}
                                  className={cn(
                                    "p-2 align-top",
                                    role === ROLE_IGNORE && "text-muted-foreground/60",
                                    role === "amount" && "text-right tabular-nums"
                                  )}
                                >
                                  {cellValue || (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              {data.rows.length > PREVIEW_ROW_LIMIT && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Info className="h-3 w-3" />
                  {t("truncatedRich", { shown: PREVIEW_ROW_LIMIT, total: data.rows.length })}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!data ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={reset}>
                {t("startOver")}
              </Button>
              <Button onClick={confirmImport} disabled={!canImport || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("confirm", { count: validCount })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
