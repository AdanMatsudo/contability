import type { Rule } from "@/domain/types";
import { normalize } from "@/lib/text";
import type { NewTransaction } from "@/services/transactions/transaction.service";
import type { ReviewRow } from "./prepare";

export interface Decision {
  index: number;
  included: boolean;
  categoryId: string | null;
  // Rule pattern to learn when the user chose or changed the category; empty = whole text.
  pattern?: string;
  // Only an explicit true creates a rule. Choosing a category alone is "just this once".
  learn?: boolean;
}

export interface ImportTransaction extends NewTransaction {
  importHash: string;
  externalId: string | null;
}

export interface NewRule {
  pattern: string;
  categoryId: string;
}

export interface ConfirmPlan {
  transactions: ImportTransaction[];
  newRules: NewRule[];
  hitRuleIds: string[];
  counts: { rows: number; imported: number; duplicates: number; excluded: number };
}

// Pure: what confirming the review would write. A rule is learned only from a
// category the user chose or changed; a suggestion merely kept teaches nothing new.
export function buildConfirmPlan(rows: ReviewRow[], decisions: Decision[], existingRules: Rule[], accountId: string): ConfirmPlan {
  const decisionByIndex = new Map(decisions.map((d) => [d.index, d]));
  const knownPatterns = new Set(existingRules.map((r) => r.pattern));
  const transactions: ImportTransaction[] = [];
  const newRules: NewRule[] = [];
  const hitRuleIds = new Set<string>();
  let duplicates = 0;
  let excluded = 0;

  for (const row of rows) {
    if (row.duplicate) {
      duplicates += 1;
      continue;
    }
    const decision = decisionByIndex.get(row.index);
    if (!decision || !decision.included) {
      excluded += 1;
      continue;
    }

    const categoryId = decision.categoryId;
    const changed = categoryId !== row.categoryId;
    let categorizedBy = row.categorizedBy;
    if (categoryId === null) categorizedBy = null;
    else if (changed) categorizedBy = "MANUAL";

    const pattern = normalize(decision.pattern ?? "") || row.normalized;
    if (categoryId && changed && decision.learn === true && pattern && !knownPatterns.has(pattern)) {
      knownPatterns.add(pattern);
      newRules.push({ pattern, categoryId });
    }
    if (!changed && row.categorizedBy === "RULE" && row.ruleId) hitRuleIds.add(row.ruleId);

    transactions.push({
      date: row.date,
      amountCents: row.amountCents,
      description: row.description,
      normalized: row.normalized,
      source: "IMPORT",
      categorizedBy,
      accountId,
      categoryId,
      importHash: row.importHash,
      externalId: row.externalId,
    });
  }

  return {
    transactions,
    newRules,
    hitRuleIds: [...hitRuleIds],
    counts: { rows: rows.length, imported: transactions.length, duplicates, excluded },
  };
}
