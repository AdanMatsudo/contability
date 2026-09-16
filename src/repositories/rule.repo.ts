import { db } from "@/lib/db";
import type { Rule } from "@/domain/types";

const select = { id: true, pattern: true, categoryId: true, hits: true } as const;

export const ruleRepo = {
  async list(): Promise<Rule[]> {
    return db.rule.findMany({ orderBy: { pattern: "asc" }, select });
  },
};
