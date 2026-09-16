import type { Transaction } from "@/domain/types";
import { matchRange } from "@/lib/text";

export type FlowFilter = "ALL" | "INCOME" | "EXPENSE";

export interface TransactionFilter {
  flow: FlowFilter;
  // undefined = any category; "none" = uncategorized only.
  categoryId: string | undefined;
  q: string;
}

const FLOWS: FlowFilter[] = ["ALL", "INCOME", "EXPENSE"];

export function parseTransactionFilter(params: { flow?: string; category?: string; q?: string }): TransactionFilter {
  return {
    flow: FLOWS.includes(params.flow as FlowFilter) ? (params.flow as FlowFilter) : "ALL",
    categoryId: params.category ? params.category : undefined,
    q: (params.q ?? "").trim(),
  };
}

export function applyTransactionFilter<T extends Transaction>(items: T[], filter: TransactionFilter): T[] {
  return items.filter((t) => {
    if (filter.flow === "INCOME" && t.amountCents < 0) return false;
    if (filter.flow === "EXPENSE" && t.amountCents >= 0) return false;
    if (filter.categoryId === "none" && t.categoryId !== null) return false;
    if (filter.categoryId && filter.categoryId !== "none" && t.categoryId !== filter.categoryId) return false;
    if (filter.q && matchRange(t.description, filter.q) === null) return false;
    return true;
  });
}
