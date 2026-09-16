import type { ParsedRow } from "@/adapters/parsers/types";
import type { CategorizedBy } from "@/domain/types";
import { computeImportHash } from "@/lib/hash";
import { normalize } from "@/lib/text";

export interface PreparedRow extends ParsedRow {
  index: number;
  normalized: string;
  cnpj: string | null;
  ordinal: number;
  importHash: string;
}

// What the review screen edits. `included` is the checkbox; duplicates start unchecked.
export interface ReviewRow extends PreparedRow {
  duplicate: boolean;
  included: boolean;
  categoryId: string | null;
  categorizedBy: CategorizedBy | null;
  ruleId?: string;
  // Company behind the CNPJ, when the lookup found one.
  razaoSocial?: string;
}

const CNPJ = /\b(\d{2})\.?(\d{3})\.?(\d{3})\/?(\d{4})-?(\d{2})\b/;

// Runs on the raw description: normalize() strips digits.
export function extractCnpj(description: string): string | null {
  const match = CNPJ.exec(description);
  return match ? match.slice(1).join("") : null;
}

export function prepareRows(rows: ParsedRow[], accountId: string): PreparedRow[] {
  const seen = new Map<string, number>();
  return rows.map((row, index) => {
    const normalized = normalize(row.description);
    const key = `${row.date}|${row.amountCents}|${normalized}`;
    const ordinal = seen.get(key) ?? 0;
    seen.set(key, ordinal + 1);
    return {
      ...row,
      index,
      normalized,
      cnpj: extractCnpj(row.description),
      ordinal,
      importHash: computeImportHash({ accountId, date: row.date, amountCents: row.amountCents, normalized, ordinal }),
    };
  });
}

export function markDuplicates(rows: PreparedRow[], existingHashes: Set<string>): ReviewRow[] {
  return rows.map((row) => {
    const duplicate = existingHashes.has(row.importHash);
    return { ...row, duplicate, included: !duplicate, categoryId: null, categorizedBy: null };
  });
}
