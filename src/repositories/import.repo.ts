import { db } from "@/lib/db";
import type { ImportBatch } from "@/domain/types";
import type { CommitInput, CommitResult } from "@/services/import/import.service";

const toDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

const select = {
  id: true,
  fileName: true,
  rowCount: true,
  importedCount: true,
  duplicateCount: true,
  createdAt: true,
  accountId: true,
  account: { select: { name: true } },
} as const;

type Row = {
  id: string;
  fileName: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  createdAt: Date;
  accountId: string;
  account: { name: string };
};

function toDomain(row: Row): ImportBatch {
  return {
    id: row.id,
    fileName: row.fileName,
    rowCount: row.rowCount,
    importedCount: row.importedCount,
    duplicateCount: row.duplicateCount,
    createdAt: row.createdAt.toISOString(),
    accountId: row.accountId,
    accountName: row.account.name,
  };
}

export const importRepo = {
  async existingHashes(hashes: string[]): Promise<Set<string>> {
    if (hashes.length === 0) return new Set();
    const rows = await db.transaction.findMany({
      where: { importHash: { in: hashes } },
      select: { importHash: true },
    });
    return new Set(rows.map((r) => r.importHash as string));
  },

  // Batch, transactions, learned rules and rule hits land together or not at all.
  async commit({ accountId, fileName, plan }: CommitInput): Promise<CommitResult> {
    return db.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          fileName,
          accountId,
          rowCount: plan.counts.rows,
          importedCount: plan.transactions.length,
          duplicateCount: plan.counts.duplicates,
        },
        select: { id: true },
      });
      if (plan.transactions.length > 0) {
        await tx.transaction.createMany({
          data: plan.transactions.map((t) => ({ ...t, date: toDate(t.date), importBatchId: batch.id })),
        });
      }
      let learnedRules = 0;
      if (plan.newRules.length > 0) {
        const created = await tx.rule.createMany({ data: plan.newRules, skipDuplicates: true });
        learnedRules = created.count;
      }
      if (plan.hitRuleIds.length > 0) {
        await tx.rule.updateMany({ where: { id: { in: plan.hitRuleIds } }, data: { hits: { increment: 1 } } });
      }
      return { batchId: batch.id, importedCount: plan.transactions.length, learnedRules };
    });
  },

  // Removes the batch and its transactions; learned rules stay. Returns rows removed.
  async undo(batchId: string): Promise<number> {
    return db.$transaction(async (tx) => {
      const removed = await tx.transaction.deleteMany({ where: { importBatchId: batchId } });
      await tx.importBatch.deleteMany({ where: { id: batchId } });
      return removed.count;
    });
  },

  async findById(id: string): Promise<ImportBatch | null> {
    const row = await db.importBatch.findUnique({ where: { id }, select });
    return row ? toDomain(row) : null;
  },

  async listRecent(limit = 10): Promise<ImportBatch[]> {
    const rows = await db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: limit, select });
    return rows.map(toDomain);
  },
};
