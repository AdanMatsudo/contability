import { isIsoDate } from "@/lib/dates";
import { parseStatementAmount } from "./amount";
import { normalizeHeader, parseCsvTable } from "./csv";
import type { ParsedRow } from "./types";

// Layout confirmed against a real export on 2026-09-16 (fixture values are synthetic):
// date,title,amount — yyyy-mm-dd, amount "54,90" (comma, quoted),
// positive = purchase, so the sign is inverted.
export const NUBANK_CARD_HEADERS = ["date", "title", "amount"];

export function isNubankCardHeader(headers: string[]): boolean {
  const got = headers.map(normalizeHeader);
  return got.length === 3 && NUBANK_CARD_HEADERS.every((h, i) => got[i] === h);
}

export function parseNubankCardCsv(text: string): ParsedRow[] {
  const table = parseCsvTable(text);
  if (!isNubankCardHeader(table.headers)) return [];
  const rows: ParsedRow[] = [];
  for (const [date, title, amountRaw] of table.rows) {
    const amountCents = parseStatementAmount(amountRaw ?? "");
    if (!isIsoDate(date ?? "") || amountCents === null) continue;
    rows.push({ date, amountCents: -amountCents, description: title ?? "", externalId: null });
  }
  return rows;
}
