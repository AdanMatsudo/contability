import type { IsoDate } from "@/lib/dates";

// One statement line after parsing: signed cents, ISO date, raw description.
export interface ParsedRow {
  date: IsoDate;
  amountCents: number;
  description: string;
  // Bank-side identifier when the file has one (Nubank "Identificador", OFX FITID).
  externalId: string | null;
}

export type StatementFormat = "nubank-account-csv" | "nubank-card-csv" | "ofx" | "generic-csv" | "unknown";

export const FORMAT_LABEL: Record<StatementFormat, string> = {
  "nubank-account-csv": "Nubank · conta",
  "nubank-card-csv": "Nubank · cartão",
  ofx: "OFX",
  "generic-csv": "CSV genérico",
  unknown: "Formato não reconhecido",
};
