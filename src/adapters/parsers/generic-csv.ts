import { isIsoDate, parseDmy } from "@/lib/dates";
import { parseStatementAmount } from "./amount";
import { normalizeHeader, parseCsvTable } from "./csv";
import type { ParsedRow } from "./types";

export interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  dateFormat: "dmy" | "ymd";
  invertSign: boolean;
}

// Stable key for remembering a mapping: sorted normalized headers.
export function headerSignature(headers: string[]): string {
  return headers.map(normalizeHeader).sort().join("|");
}

function readDate(raw: string, format: ColumnMapping["dateFormat"]): string | null {
  if (format === "dmy") return parseDmy(raw);
  return isIsoDate(raw) ? raw : null;
}


export function parseGenericCsv(text: string, mapping: ColumnMapping): ParsedRow[] {
  const table = parseCsvTable(text);
  const headers = table.headers.map(normalizeHeader);
  const col = (name: string) => headers.indexOf(normalizeHeader(name));
  const dateCol = col(mapping.date);
  const amountCol = col(mapping.amount);
  const descriptionCol = col(mapping.description);
  if (dateCol === -1 || amountCol === -1 || descriptionCol === -1) return [];

  const rows: ParsedRow[] = [];
  for (const cells of table.rows) {
    const date = readDate(cells[dateCol] ?? "", mapping.dateFormat);
    const amount = parseStatementAmount(cells[amountCol] ?? "");
    if (!date || amount === null) continue;
    rows.push({
      date,
      amountCents: mapping.invertSign ? -amount : amount,
      description: cells[descriptionCol] ?? "",
      externalId: null,
    });
  }
  return rows;
}
