import type { Rule } from "@/domain/types";
import type { ReviewRow } from "@/services/import/prepare";
import { matchRule } from "./rules";

export type Lookup = (keys: string[]) => Promise<Map<string, string | null>>;

// The CNPJ stage answers with more than a category: the company name explains
// on screen why a line was classified, and survives an unmapped CNAE.
export interface CnpjAnswer {
  categoryId: string | null;
  razaoSocial?: string | null;
}

export type CnpjLookup = (cnpjs: string[]) => Promise<Map<string, CnpjAnswer>>;

export interface CascadeDeps {
  rules: Rule[];
  // CNPJ → category and company name (via BrasilAPI + CNAE mapping).
  byCnpj?: CnpjLookup;
  // normalized → categoryId. Absent until M5 or while AI_ENABLED is off.
  byAi?: Lookup;
}

export interface CascadeResult {
  rows: ReviewRow[];
  warnings: string[];
}

const pending = (row: ReviewRow) => !row.duplicate && row.categoryId === null;

// RULE → CNPJ → AI, each stage only for rows still uncategorized. An outside
// stage failing becomes a warning; the rows just stay uncategorized.
export async function categorizeRows(input: ReviewRow[], deps: CascadeDeps): Promise<CascadeResult> {
  const rows = input.map((r) => ({ ...r }));
  const warnings: string[] = [];

  for (const row of rows) {
    if (!pending(row)) continue;
    const rule = matchRule(row.normalized, deps.rules);
    if (rule) Object.assign(row, { categoryId: rule.categoryId, categorizedBy: "RULE", ruleId: rule.id });
  }

  if (deps.byCnpj) {
    const targets = rows.filter((r) => pending(r) && r.cnpj);
    const cnpjs = [...new Set(targets.map((r) => r.cnpj as string))];
    if (cnpjs.length > 0) {
      try {
        const found = await deps.byCnpj(cnpjs);
        for (const row of targets) {
          const answer = found.get(row.cnpj as string);
          if (!answer) continue;
          if (answer.razaoSocial) row.razaoSocial = answer.razaoSocial;
          if (answer.categoryId) Object.assign(row, { categoryId: answer.categoryId, categorizedBy: "CNPJ" });
        }
      } catch {
        warnings.push("Consulta de CNPJ indisponível agora; essas linhas seguem sem categoria.");
      }
    }
  }

  if (deps.byAi) {
    const targets = rows.filter(pending);
    const keys = [...new Set(targets.map((r) => r.normalized))];
    if (keys.length > 0) {
      try {
        const found = await deps.byAi(keys);
        for (const row of targets) {
          const categoryId = found.get(row.normalized);
          if (categoryId) Object.assign(row, { categoryId, categorizedBy: "AI" });
        }
      } catch {
        warnings.push("IA indisponível neste lote; essas linhas seguem sem categoria.");
      }
    }
  }

  return { rows, warnings };
}
