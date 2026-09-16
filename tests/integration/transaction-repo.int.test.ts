import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data";
import { categoryRepo } from "@/repositories/category.repo";
import { transactionRepo } from "@/repositories/transaction.repo";
import type { NewTransaction } from "@/services/transactions/transaction.service";
import { db, truncateAll } from "./db";

async function fixtures() {
  await seedDatabase(db);
  const categories = await categoryRepo.list();
  const account = await db.account.findFirstOrThrow();
  const byName = (name: string) => categories.find((c) => c.name === name)!;
  return { account, mercado: byName("Mercado"), salario: byName("Salário"), transfer: byName("Transferência") };
}

function draft(overrides: Partial<NewTransaction> & { accountId: string }): NewTransaction {
  return {
    date: "2026-09-10",
    amountCents: -1000,
    description: "X",
    normalized: "X",
    source: "MANUAL",
    categorizedBy: null,
    categoryId: null,
    ...overrides,
  };
}

describe("transactionRepo", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates and lists a month as domain objects with ISO dates, newest first", async () => {
    const { account, mercado } = await fixtures();
    const created = await transactionRepo.create(
      draft({ accountId: account.id, categoryId: mercado.id, categorizedBy: "MANUAL", amountCents: -3240, description: "Padaria" }),
    );
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-09-20", description: "Later" }));
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-08-31", description: "August" }));

    expect(created).toMatchObject({
      date: "2026-09-10",
      amountCents: -3240,
      description: "Padaria",
      source: "MANUAL",
      categorizedBy: "MANUAL",
      categoryId: mercado.id,
      accountId: account.id,
      importBatchId: null,
      recurringId: null,
    });
    expect(typeof created.id).toBe("string");

    const september = await transactionRepo.listByMonth("2026-09");
    expect(september.map((t) => t.description)).toEqual(["Later", "Padaria"]);
  });

  it("updates and removes", async () => {
    const { account } = await fixtures();
    const created = await transactionRepo.create(draft({ accountId: account.id }));
    const updated = await transactionRepo.update(created.id, { amountCents: -2000, description: "Y", normalized: "Y" });
    expect(updated.amountCents).toBe(-2000);
    expect(updated.description).toBe("Y");

    await transactionRepo.remove(created.id);
    expect(await transactionRepo.listByMonth("2026-09")).toEqual([]);
  });

  it("returns null when asked for a missing id", async () => {
    await fixtures();
    expect(await transactionRepo.findById("nope")).toBeNull();
  });

  it("sums income and expenses per month across a range, leaving transfers out", async () => {
    const { account, mercado, salario, transfer } = await fixtures();
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-09-05", amountCents: 500000, categoryId: salario.id }));
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-09-06", amountCents: -30000, categoryId: mercado.id }));
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-09-07", amountCents: -250000, categoryId: transfer.id }));
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-07-15", amountCents: -1500 }));
    await transactionRepo.create(draft({ accountId: account.id, date: "2026-03-15", amountCents: -99 }));

    const totals = await transactionRepo.sumByMonthRange("2026-04", "2026-09");
    expect(totals).toEqual([
      { month: "2026-07", incomeCents: 0, expenseCents: 1500 },
      { month: "2026-09", incomeCents: 500000, expenseCents: 30000 },
    ]);
  });
});
