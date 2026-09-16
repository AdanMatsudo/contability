import { isIsoDate } from "@/lib/dates";
import { parseStatementAmount } from "./amount";
import type { ParsedRow } from "./types";

// Handles both SGML (no closing tags) and XML OFX: every field is read as
// "<TAG>value" up to the next tag or line break, which works for both.
function field(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
  return match ? match[1].trim() : null;
}

export function isOfx(text: string): boolean {
  return /<OFX>/i.test(text) || /^OFXHEADER:/m.test(text);
}

export function parseOfx(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  for (const block of blocks) {
    const posted = field(block, "DTPOSTED") ?? "";
    const date = `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}`;
    const amountCents = parseStatementAmount(field(block, "TRNAMT") ?? "");
    if (!isIsoDate(date) || amountCents === null) continue;
    rows.push({
      date,
      amountCents,
      description: field(block, "MEMO") || field(block, "NAME") || "",
      externalId: field(block, "FITID") || null,
    });
  }
  return rows;
}
