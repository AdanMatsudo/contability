import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data";
import { categoryRepo } from "@/repositories/category.repo";
import { importRepo } from "@/repositories/import.repo";
import { ruleRepo } from "@/repositories/rule.repo";
import { csvMappingRepo } from "@/repositories/csv-mapping.repo";
import { transactionRepo } from "@/repositories/transaction.repo";
import type { ConfirmPlan } from "@/services/import/confirm";
import { db, truncateAll } from "./db";

async function fixtures() {
  await seedDatabase(db);
  const categories = await categoryRepo.list();
  const account = await db.account.findFirstOrThrow();
  const byName = (name: string) => categories.find((c) => c.name === name)!;
  const rules = await ruleRepo.list();
  return { account, mercado: byName("Mercado"), lazer: byName("Lazer"), uberRule: rules.find((r) => r.pattern === "UBER")! };
}

function plan(accountId: string, categoryId: string, uberRuleId: string): ConfirmPlan {
  return {
    transactions: [
      {
        date: "2026-09-01",
        amountCents: -3240,
        description: "PADARIA",
        normalized: "PADARIA",
        source: "IMPORT",
        categorizedBy: "MANUAL",
        accountId,
        categoryId,
        importHash: "hash-1",
        externalId: "ext-1",
      },
      {
        date: "2026-09-02",
        amountCents: -8990,
        description: "UBER TRIP",
        normalized: "UBER TRIP",
        source: "IMPORT",
        categorizedBy: "RULE",
        accountId,
        categoryId,
        importHash: "hash-2",
        externalId: null,
      },
    ],
    newRules: [{ pattern: "PADARIA", categoryId }],
    hitRuleIds: [uberRuleId],
    counts: { rows: 3, imported: 2, duplicates: 1, excluded: 0 },
  };
}

describe("importRepo", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("commits batch, transactions, learned rules and rule hits together", async () => {
    const { account, mercado, uberRule } = await fixtures();
    const result = await importRepo.commit({ accountId: account.id, fileName: "conta.csv", plan: plan(account.id, mercado.id, uberRule.id) });

    expect(result.importedCount).toBe(2);
    expect(result.learnedRules).toBe(1);
    const batch = await importRepo.findById(result.batchId);
    expect(batch).toMatchObject({ fileName: "conta.csv", rowCount: 3, importedCount: 2, duplicateCount: 1, accountId: account.id });

    const september = await transactionRepo.listByMonth("2026-09");
    expect(september).toHaveLength(2);
    expect(september.every((t) => t.importBatchId === result.batchId)).toBe(true);

    const rules = await ruleRepo.list();
    expect(rules.find((r) => r.pattern === "PADARIA")?.categoryId).toBe(mercado.id);
    expect(rules.find((r) => r.pattern === "UBER")?.hits).toBe(uberRule.hits + 1);
  });

  it("reports existing hashes so a second import is all duplicates", async () => {
    const { account, mercado, uberRule } = await fixtures();
    await importRepo.commit({ accountId: account.id, fileName: "conta.csv", plan: plan(account.id, mercado.id, uberRule.id) });
    const existing = await importRepo.existingHashes(["hash-1", "hash-2", "hash-3"]);
    expect([...existing].sort()).toEqual(["hash-1", "hash-2"]);
  });

  it("skips a learned rule whose pattern already exists instead of failing", async () => {
    const { account, mercado, uberRule } = await fixtures();
    const p = plan(account.id, mercado.id, uberRule.id);
    p.newRules = [{ pattern: "UBER", categoryId: mercado.id }];
    const result = await importRepo.commit({ accountId: account.id, fileName: "x.csv", plan: p });
    expect(result.learnedRules).toBe(0);
    expect((await ruleRepo.list()).find((r) => r.pattern === "UBER")?.categoryId).not.toBe(mercado.id);
  });

  it("undo removes only that batch's transactions and keeps the learned rules", async () => {
    const { account, mercado, lazer, uberRule } = await fixtures();
    const first = await importRepo.commit({ accountId: account.id, fileName: "a.csv", plan: plan(account.id, mercado.id, uberRule.id) });
    const second = plan(account.id, lazer.id, uberRule.id);
    second.transactions = second.transactions.map((t) => ({ ...t, importHash: `${t.importHash}-b`, date: "2026-09-15" }));
    second.newRules = [{ pattern: "CINEMARK", categoryId: lazer.id }];
    const other = await importRepo.commit({ accountId: account.id, fileName: "b.csv", plan: second });

    const removed = await importRepo.undo(first.batchId);
    expect(removed).toBe(2);
    expect(await importRepo.findById(first.batchId)).toBeNull();
    expect(await importRepo.findById(other.batchId)).not.toBeNull();
    expect(await transactionRepo.listByMonth("2026-09")).toHaveLength(2);
    expect((await ruleRepo.list()).some((r) => r.pattern === "PADARIA")).toBe(true);
    expect(await importRepo.undo("missing")).toBe(0);
  });

  it("lists recent batches newest first", async () => {
    const { account, mercado, uberRule } = await fixtures();
    await importRepo.commit({ accountId: account.id, fileName: "a.csv", plan: plan(account.id, mercado.id, uberRule.id) });
    const p = plan(account.id, mercado.id, uberRule.id);
    p.transactions = p.transactions.map((t) => ({ ...t, importHash: `${t.importHash}-b` }));
    await importRepo.commit({ accountId: account.id, fileName: "b.csv", plan: p });
    const recent = await importRepo.listRecent(5);
    expect(recent.map((b) => b.fileName)).toEqual(["b.csv", "a.csv"]);
    expect(recent[0].accountName).toBe(account.name);
  });
});

describe("csvMappingRepo", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("saves and finds a mapping by header signature, overwriting on save", async () => {
    expect(await csvMappingRepo.find("onde|quando|quanto")).toBeNull();
    const mapping = { date: "Quando", amount: "Quanto", description: "Onde", dateFormat: "dmy" as const, invertSign: false };
    await csvMappingRepo.save("onde|quando|quanto", mapping);
    expect(await csvMappingRepo.find("onde|quando|quanto")).toEqual(mapping);
    await csvMappingRepo.save("onde|quando|quanto", { ...mapping, invertSign: true });
    expect((await csvMappingRepo.find("onde|quando|quanto"))?.invertSign).toBe(true);
  });
});
