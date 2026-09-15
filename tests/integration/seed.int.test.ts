import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data";
import { categoryRepo } from "@/repositories/category.repo";
import { db, truncateAll } from "./db";

describe("seed", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates the defaults and is idempotent", async () => {
    const first = await seedDatabase(db);
    const second = await seedDatabase(db);
    expect(second).toEqual(first);
    expect(first.accounts).toBe(3);
    expect(first.categories).toBe(15);
    expect(first.rules).toBeGreaterThan(0);
    expect(first.cnaeMappings).toBeGreaterThan(0);
  });

  it("does not overwrite a budget the user set", async () => {
    await seedDatabase(db);
    const mercado = (await categoryRepo.list()).find((c) => c.name === "Mercado");
    expect(mercado).toBeDefined();
    await categoryRepo.update(mercado!.id, { budgetCents: 80000 });
    await seedDatabase(db);
    const again = (await categoryRepo.list()).find((c) => c.name === "Mercado");
    expect(again?.budgetCents).toBe(80000);
  });

  it("deleting a category keeps its transactions, uncategorized", async () => {
    await seedDatabase(db);
    const categories = await categoryRepo.list();
    const lazer = categories.find((c) => c.name === "Lazer")!;
    const account = await db.account.findFirstOrThrow();
    await db.transaction.create({
      data: {
        date: new Date("2026-09-10T00:00:00Z"),
        amountCents: -7800,
        description: "CINEMARK",
        normalized: "CINEMARK",
        source: "MANUAL",
        categorizedBy: "MANUAL",
        accountId: account.id,
        categoryId: lazer.id,
      },
    });
    await categoryRepo.remove(lazer.id);
    const tx = await db.transaction.findFirstOrThrow({ where: { description: "CINEMARK" } });
    expect(tx.categoryId).toBeNull();
  });
});
