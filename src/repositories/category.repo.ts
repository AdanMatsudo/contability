import { db } from "@/lib/db";
import type { Category, CategoryKind } from "@/domain/types";
import type { IsoDate } from "@/lib/dates";

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  budgetCents: number | null;
  color: string;
}

export const categoryRepo = {
  async list(): Promise<Category[]> {
    return db.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true, budgetCents: true, color: true },
    });
  },

  async create(input: CategoryInput): Promise<Category> {
    return db.category.create({
      data: input,
      select: { id: true, name: true, kind: true, budgetCents: true, color: true },
    });
  },

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    return db.category.update({
      where: { id },
      data: input,
      select: { id: true, name: true, kind: true, budgetCents: true, color: true },
    });
  },

  // Transactions keep existing with categoryId = null (schema: onDelete SetNull);
  // rules and CNAE mappings pointing here are removed (onDelete Cascade).
  async remove(id: string): Promise<void> {
    await db.category.delete({ where: { id } });
  },

  async countTransactions(id: string): Promise<number> {
    return db.transaction.count({ where: { categoryId: id } });
  },

  // Transactions per category from `since` (inclusive). Feeds the "most used" sort.
  async usageCounts(since: IsoDate): Promise<Record<string, number>> {
    const rows = await db.transaction.groupBy({
      by: ["categoryId"],
      where: { categoryId: { not: null }, date: { gte: new Date(`${since}T00:00:00Z`) } },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.categoryId) counts[row.categoryId] = row._count._all;
    }
    return counts;
  },
};
