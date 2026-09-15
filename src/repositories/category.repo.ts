import { db } from "@/lib/db";
import type { Category, CategoryKind } from "@/domain/types";

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
};
