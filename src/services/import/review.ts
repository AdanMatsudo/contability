import { normalize } from "@/lib/text";
import { suggestPattern } from "@/services/categorization/rules";
import type { Category } from "@/domain/types";
import type { Decision } from "./confirm";
import type { ReviewRow } from "./prepare";

// One choice on the review screen: set the category on that row, attach the
// pattern that becomes a rule (learning is the default; the owner unticks the
// few uncertain ones, decided 2026-09-16), and give the same category to every
// other included, still-uncategorized row the pattern already matches. Only the
// chosen row carries the learn flag, so a family yields one rule at most.
export function applyChoice(
  rows: ReviewRow[],
  decisions: Record<number, Decision>,
  index: number,
  categoryId: string | null,
  pattern?: string,
): Record<number, Decision> {
  const row = rows.find((r) => r.index === index);
  if (!row) return decisions;
  const next = { ...decisions };
  const current = next[index] ?? { index, included: row.included, categoryId: row.categoryId };

  if (categoryId === null) {
    next[index] = { ...current, categoryId: null, pattern: undefined, learn: false };
    return next;
  }

  const learned = normalize(pattern ?? "") || suggestPattern(row.description);
  next[index] = { ...current, categoryId, pattern: learned, learn: true };

  for (const other of rows) {
    if (other.index === index || other.duplicate) continue;
    const decision = next[other.index] ?? { index: other.index, included: other.included, categoryId: other.categoryId };
    if (!decision.included || decision.categoryId !== null) continue;
    if (other.normalized.includes(learned)) next[other.index] = { ...decision, categoryId, pattern: learned, learn: false };
  }
  return next;
}

// Turning a pattern off clears every row that carries it; turning it on marks
// only the first such row, so the summary still shows one rule per pattern.
export function setLearn(decisions: Record<number, Decision>, pattern: string, learn: boolean): Record<number, Decision> {
  const next = { ...decisions };
  const indexes = Object.values(next)
    .filter((d) => d.pattern === pattern)
    .map((d) => d.index)
    .sort((a, b) => a - b);
  indexes.forEach((i, position) => {
    next[i] = { ...next[i], learn: learn && position === 0 };
  });
  return next;
}

export interface RuleToLearn {
  pattern: string;
  categoryId: string;
  // Rows in this file that share the pattern and category.
  rows: number;
}

export function rulesToLearn(rows: ReviewRow[], decisions: Record<number, Decision>): RuleToLearn[] {
  const byIndex = new Map(rows.map((r) => [r.index, r]));
  const out: RuleToLearn[] = [];
  const ordered = Object.values(decisions).sort((a, b) => a.index - b.index);
  for (const d of ordered) {
    const row = byIndex.get(d.index);
    if (!row || row.duplicate || !d.included || !d.learn || !d.categoryId || !d.pattern) continue;
    if (d.categoryId === row.categoryId) continue;
    if (out.some((r) => r.pattern === d.pattern)) continue;
    const count = ordered.filter((o) => o.included && o.pattern === d.pattern && o.categoryId === d.categoryId).length;
    out.push({ pattern: d.pattern, categoryId: d.categoryId, rows: count });
  }
  return out;
}

export const UNCATEGORIZED_KEY = "none";
export const EXCLUDED_KEY = "excluded";
export const UNCATEGORIZED_COLOR = "#eb6834";

export interface ReviewGroup {
  key: string;
  name: string;
  color: string;
  rows: ReviewRow[];
  expenseCents: number;
  incomeCents: number;
}

const byDateDesc = (a: ReviewRow, b: ReviewRow) => b.date.localeCompare(a.date) || a.index - b.index;

// The review read by category: what still needs a decision first, then the
// categories by money, then what stays out. Subtotals count included rows only.
export function groupForReview(rows: ReviewRow[], decisions: Record<number, Decision>, categories: Category[]): ReviewGroup[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<string, ReviewGroup>();
  const ensure = (key: string, name: string, color: string) => {
    let g = groups.get(key);
    if (!g) {
      g = { key, name, color, rows: [], expenseCents: 0, incomeCents: 0 };
      groups.set(key, g);
    }
    return g;
  };

  for (const row of rows) {
    const decision = decisions[row.index];
    const included = !row.duplicate && (decision?.included ?? row.included);
    if (!included) {
      ensure(EXCLUDED_KEY, "Fora da importação", "#c9c8c2").rows.push(row);
      continue;
    }
    const categoryId = decision?.categoryId ?? row.categoryId;
    const category = categoryId ? categoryById.get(categoryId) : undefined;
    const group = category
      ? ensure(category.id, category.name, category.color)
      : ensure(UNCATEGORIZED_KEY, "Sem categoria", UNCATEGORIZED_COLOR);
    group.rows.push(row);
    if (row.amountCents < 0) group.expenseCents += -row.amountCents;
    else group.incomeCents += row.amountCents;
  }

  const list = [...groups.values()];
  list.forEach((g) => g.rows.sort(byDateDesc));
  const rank = (g: ReviewGroup) => (g.key === UNCATEGORIZED_KEY ? 0 : g.key === EXCLUDED_KEY ? 2 : 1);
  return list.sort(
    (a, b) => rank(a) - rank(b) || b.expenseCents - a.expenseCents || a.name.localeCompare(b.name, "pt-BR"),
  );
}
