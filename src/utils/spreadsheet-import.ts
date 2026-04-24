import { parseCSV } from "@/utils/export";

/**
 * Result shape shared by every spreadsheet source we accept.
 *
 * - `headers`: column titles, in file order.
 * - `rows`: each cell keyed by header — first key in iteration order is the
 *   first column. Empty/missing cells are present as empty strings so the
 *   downstream mapping UI can iterate consistently.
 */
export interface SpreadsheetData {
  headers: string[];
  rows: Record<string, string>[];
  source: "csv" | "xlsx";
}

function isXlsxFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return true;
  // Some browsers report a generic mime; trust the extension primarily.
  return file.type.includes("spreadsheetml") || file.type.includes("excel");
}

/**
 * Parse an Excel file using SheetJS. Imported dynamically so the ~600KB library
 * doesn't land in the main bundle — users who never import an Excel file pay
 * nothing for the support.
 */
async function parseXlsx(file: File): Promise<SpreadsheetData> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [], source: "xlsx" };
  }
  const sheet = workbook.Sheets[firstSheetName];
  // header:1 returns rows as arrays so we can distinguish the header row from
  // data without losing column order. defval keeps gaps so column indices align.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (aoa.length === 0) return { headers: [], rows: [], source: "xlsx" };
  const [headerRow, ...dataRows] = aoa;
  const headers = (headerRow as unknown[]).map((c, i) => String(c ?? "").trim() || `Col ${i + 1}`);
  const rows = dataRows
    .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const cell = (r as unknown[])[idx];
        record[h] = cell === undefined || cell === null ? "" : String(cell).trim();
      });
      return record;
    });
  return { headers, rows, source: "xlsx" };
}

/**
 * Read a File and return a uniform { headers, rows } structure regardless of
 * whether it's CSV or Excel. The mapping UI only ever sees this shape.
 */
export async function readSpreadsheet(file: File): Promise<SpreadsheetData> {
  if (isXlsxFile(file)) {
    return parseXlsx(file);
  }
  const text = await file.text();
  const { headers, rows } = parseCSV(text);
  return { headers, rows, source: "csv" };
}

/** File input `accept` string covering every supported source. */
export const ACCEPT_SPREADSHEET = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
