import { parseDmy } from "@/lib/dates";
import { parseStatementAmount } from "./amount";
import { normalizeHeader, parseCsvTable } from "./csv";
import type { ParsedRow } from "./types";

// Layout as of 2026-09 (synthetic fixture, validate against a real export):
// Data,Valor,Identificador,Descrição — dd/mm/yyyy, decimal point, negative = out.
export const NUBANK_ACCOUNT_HEADERS = ["data", "valor", "identificador", "descricao"];

export function isNubankAccountHeader(headers: string[]): boolean {
  const got = headers.map(normalizeHeader);
  return got.length === 4 && NUBANK_ACCOUNT_HEADERS.every((h, i) => got[i] === h);
}

export function parseNubankAccountCsv(text: string): ParsedRow[] {
  const table = parseCsvTable(text);
  if (!isNubankAccountHeader(table.headers)) return [];
  const rows: ParsedRow[] = [];
  for (const [dateRaw, amountRaw, id, description] of table.rows) {
    const date = parseDmy(dateRaw ?? "");
    const amountCents = parseStatementAmount(amountRaw ?? "");
    if (!date || amountCents === null) continue;
    rows.push({ date, amountCents, description: description ?? "", externalId: id ? id : null });
  }
  return rows;
}
