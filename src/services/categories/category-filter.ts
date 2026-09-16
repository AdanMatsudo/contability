import type { Category, CategoryKind } from "@/domain/types";
import { stripAccents } from "@/lib/text";

export type CategorySort = "name" | "budget" | "usage";
export type KindFilter = CategoryKind | "ALL";

export interface CategoryFilter {
  q: string;
  kind: KindFilter;
  sort: CategorySort;
}

export interface CategoryWithUsage extends Category {
  usageCount: number;
}

const KINDS: KindFilter[] = ["ALL", "EXPENSE", "INCOME", "TRANSFER"];
const SORTS: CategorySort[] = ["name", "budget", "usage"];

export function parseCategoryFilter(params: { q?: string; kind?: string; sort?: string }): CategoryFilter {
  return {
    q: (params.q ?? "").trim(),
    kind: KINDS.includes(params.kind as KindFilter) ? (params.kind as KindFilter) : "ALL",
    sort: SORTS.includes(params.sort as CategorySort) ? (params.sort as CategorySort) : "name",
  };
}

// Case- and accent-insensitive fold that keeps one output char per input char,
// so an index found in the folded string points at the same place in the original.
function fold(input: string): string {
  return Array.from(input, (ch) => stripAccents(ch).toLowerCase()).join("");
}

export function matchRange(name: string, q: string): [number, number] | null {
  const needle = fold(q.trim());
  if (!needle) return null;
  const start = fold(name).indexOf(needle);
  return start === -1 ? null : [start, start + needle.length];
}

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "pt-BR");

const COMPARATORS: Record<CategorySort, (a: CategoryWithUsage, b: CategoryWithUsage) => number> = {
  name: byName,
  budget: (a, b) => (b.budgetCents ?? -1) - (a.budgetCents ?? -1) || byName(a, b),
  usage: (a, b) => b.usageCount - a.usageCount || byName(a, b),
};

export function filterAndSort<T extends CategoryWithUsage>(items: T[], filter: CategoryFilter): T[] {
  return items
    .filter((c) => filter.kind === "ALL" || c.kind === filter.kind)
    .filter((c) => matchRange(c.name, filter.q) !== null || !filter.q.trim())
    .sort(COMPARATORS[filter.sort]);
}
