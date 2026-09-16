import { parseBrl, parseDecimal } from "@/lib/money";

// Bank exports disagree on decimals: Nubank's card CSV writes "54,90" (quoted),
// OFX and older CSVs write 54.90. Accept both; the caller decides the sign.
export function parseStatementAmount(raw: string): number | null {
  const cleaned = raw.replace(/^"|"$/g, "").replace(/^\+/, "").trim();
  if (!cleaned) return null;
  return parseDecimal(cleaned) ?? parseBrl(cleaned);
}
