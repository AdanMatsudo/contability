import { parseCsvTable } from "@/adapters/parsers/csv";
import { detectFormat } from "@/adapters/parsers/detect";
import { headerSignature, parseGenericCsv, type ColumnMapping } from "@/adapters/parsers/generic-csv";
import { parseNubankAccountCsv } from "@/adapters/parsers/nubank-account-csv";
import { parseNubankCardCsv } from "@/adapters/parsers/nubank-card-csv";
import { parseOfx } from "@/adapters/parsers/ofx";
import type { ParsedRow, StatementFormat } from "@/adapters/parsers/types";
import type { Rule } from "@/domain/types";
import { ValidationError } from "@/lib/errors";
import { categorizeRows, type CnpjLookup, type Lookup } from "@/services/categorization/cascade";
import { buildConfirmPlan, type ConfirmPlan, type Decision, type NewRule } from "./confirm";
import { markDuplicates, prepareRows, type ReviewRow } from "./prepare";

export interface PrepareInput {
  text: string;
  fileName: string;
  accountId: string;
  mapping?: ColumnMapping;
}

export interface PrepareDeps {
  rules: Rule[];
  existingHashes: (hashes: string[]) => Promise<Set<string>>;
  findMapping: (signature: string) => Promise<ColumnMapping | null>;
  byCnpj?: CnpjLookup;
  byAi?: Lookup;
}

export interface PreparedImport {
  format: StatementFormat;
  fileName: string;
  accountId: string;
  rows: ReviewRow[];
  warnings: string[];
  // Generic CSV with no known mapping: the screen asks for one using these.
  needsMapping: boolean;
  headers?: string[];
  preview?: string[][];
  signature?: string;
  mapping?: ColumnMapping;
}

// File → rows ready to review. Nothing is written; the review lives in the client.
export async function prepareImport(input: PrepareInput, deps: PrepareDeps): Promise<PreparedImport> {
  const format = detectFormat(input.text);
  const base = { format, fileName: input.fileName, accountId: input.accountId, warnings: [] as string[], needsMapping: false };

  let parsed: ParsedRow[] = [];
  let mapping = input.mapping;
  let signature: string | undefined;

  if (format === "nubank-account-csv") parsed = parseNubankAccountCsv(input.text);
  else if (format === "nubank-card-csv") parsed = parseNubankCardCsv(input.text);
  else if (format === "ofx") parsed = parseOfx(input.text);
  else if (format === "generic-csv") {
    const table = parseCsvTable(input.text);
    signature = headerSignature(table.headers);
    mapping = mapping ?? (await deps.findMapping(signature)) ?? undefined;
    if (!mapping) {
      return { ...base, needsMapping: true, headers: table.headers, preview: table.rows.slice(0, 5), signature, rows: [] };
    }
    parsed = parseGenericCsv(input.text, mapping);
  }

  const prepared = prepareRows(parsed, input.accountId);
  const existing = await deps.existingHashes(prepared.map((r) => r.importHash));
  const { rows, warnings } = await categorizeRows(markDuplicates(prepared, existing), {
    rules: deps.rules,
    byCnpj: deps.byCnpj,
    byAi: deps.byAi,
  });

  return { ...base, rows, warnings, signature, mapping };
}

export interface ConfirmInput {
  rows: ReviewRow[];
  decisions: Decision[];
  accountId: string;
  fileName: string;
}

export interface CommitInput {
  accountId: string;
  fileName: string;
  plan: ConfirmPlan;
}

export interface CommitResult {
  batchId: string;
  importedCount: number;
  learnedRules: number;
}

export interface ConfirmDeps {
  rules: Rule[];
  commit: (input: CommitInput) => Promise<CommitResult>;
}

export interface ImportResult {
  batchId: string;
  importedCount: number;
  duplicateCount: number;
  excludedCount: number;
  learnedRules: NewRule[];
}

export async function confirmImport(input: ConfirmInput, deps: ConfirmDeps): Promise<ImportResult> {
  const plan = buildConfirmPlan(input.rows, input.decisions, deps.rules, input.accountId);
  const uncategorized = plan.transactions.filter((t) => t.categoryId === null).length;
  if (uncategorized > 0) {
    throw new ValidationError(
      {},
      uncategorized === 1
        ? "Uma linha incluída está sem categoria. Escolha uma ou desmarque a linha."
        : `${uncategorized} linhas incluídas estão sem categoria. Escolha ou desmarque.`,
    );
  }
  const result = await deps.commit({ accountId: input.accountId, fileName: input.fileName, plan });
  return {
    batchId: result.batchId,
    importedCount: result.importedCount,
    duplicateCount: plan.counts.duplicates,
    excludedCount: plan.counts.excluded,
    learnedRules: plan.newRules,
  };
}
