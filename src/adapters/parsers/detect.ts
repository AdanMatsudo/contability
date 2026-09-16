import { parseCsvTable } from "./csv";
import { isNubankAccountHeader } from "./nubank-account-csv";
import { isNubankCardHeader } from "./nubank-card-csv";
import { isOfx } from "./ofx";
import type { StatementFormat } from "./types";

export function detectFormat(text: string): StatementFormat {
  if (!text.trim()) return "unknown";
  if (isOfx(text)) return "ofx";
  const { headers } = parseCsvTable(text);
  if (isNubankAccountHeader(headers)) return "nubank-account-csv";
  if (isNubankCardHeader(headers)) return "nubank-card-csv";
  return headers.length >= 2 ? "generic-csv" : "unknown";
}
