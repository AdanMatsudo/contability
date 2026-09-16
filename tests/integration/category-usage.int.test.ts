import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data";
import { categoryRepo } from "@/repositories/category.repo";
import { db, truncateAll } from "./db";

async function addTransaction(categoryId: string | null, date: string, accountId: string) {
  await db.transaction.create({
    data: {
      date: new Date(`${date}T00:00:00Z`),
      amountCents: -1000,
      description: "X",
      normalized: "X",
      source: "MANUAL",
      accountId,
      categoryId,
    },
  });
}

describe("categoryRepo.usageCounts", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("counts transactions per category from the given date on, ignoring older and uncategorized ones", async () => {
    await seedDatabase(db);
    const categories = await categoryRepo.list();
    const mercado = categories.find((c) => c.name === "Mercado")!;
    const lazer = categories.find((c) => c.name === "Lazer")!;
    const account = await db.account.findFirstOrThrow();

    await addTransaction(mercado.id, "2026-09-01", account.id);
    await addTransaction(mercado.id, "2026-09-10", account.id);
    await addTransaction(lazer.id, "2026-05-01", account.id);
    await addTransaction(null, "2026-09-10", account.id);

    const counts = await categoryRepo.usageCounts("2026-06-17");
    expect(counts[mercado.id]).toBe(2);
    expect(counts[lazer.id]).toBeUndefined();
    expect(Object.keys(counts)).toHaveLength(1);
  });
});
