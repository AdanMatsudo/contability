import { describe, expect, it } from "vitest";
import type { Category, Transaction } from "@/domain/types";
import { history6, summarize } from "./month.service";

const categories: Category[] = [
  { id: "mercado", name: "Mercado", kind: "EXPENSE", budgetCents: 100000, color: "#1" },
  { id: "casa", name: "Casa", kind: "EXPENSE", budgetCents: null, color: "#2" },
  { id: "lazer", name: "Lazer", kind: "EXPENSE", budgetCents: 20000, color: "#3" },
  { id: "saude", name: "Saúde", kind: "EXPENSE", budgetCents: null, color: "#4" },
  { id: "transporte", name: "Transporte", kind: "EXPENSE", budgetCents: null, color: "#5" },
  { id: "compras", name: "Compras", kind: "EXPENSE", budgetCents: null, color: "#6" },
  { id: "salario", name: "Salário", kind: "INCOME", budgetCents: null, color: "#7" },
  { id: "fatura", name: "Transferência", kind: "TRANSFER", budgetCents: null, color: "#8" },
];

let seq = 0;
function tx(date: string, amountCents: number, categoryId: string | null): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    date,
    amountCents,
    description: "x",
    normalized: "X",
    source: "MANUAL",
    categorizedBy: null,
    accountId: "acc",
    categoryId,
    importBatchId: null,
    recurringId: null,
  };
}

describe("summarize", () => {
  it("totals income and expenses, leaving transfers out", () => {
    const s = summarize(
      [
        tx("2026-09-05", 500000, "salario"),
        tx("2026-09-06", -30000, "mercado"),
        tx("2026-09-07", -250000, "fatura"),
        tx("2026-09-08", -1500, null),
      ],
      categories,
      "2026-09",
    );
    expect(s.incomeCents).toBe(500000);
    expect(s.expenseCents).toBe(31500);
    expect(s.balanceCents).toBe(468500);
  });

  it("produces one entry per calendar day with a running balance", () => {
    const s = summarize([tx("2026-09-02", 10000, "salario"), tx("2026-09-03", -4000, "casa")], categories, "2026-09");
    expect(s.days).toHaveLength(30);
    expect(s.days[0]).toEqual({ date: "2026-09-01", incomeCents: 0, expenseCents: 0, cumulativeCents: 0 });
    expect(s.days[1]).toEqual({ date: "2026-09-02", incomeCents: 10000, expenseCents: 0, cumulativeCents: 10000 });
    expect(s.days[2]).toEqual({ date: "2026-09-03", incomeCents: 0, expenseCents: 4000, cumulativeCents: 6000 });
    expect(s.days[29].cumulativeCents).toBe(6000);
  });

  it("groups expenses by category, largest first, uncategorized as its own bucket", () => {
    const s = summarize(
      [tx("2026-09-01", -5000, "mercado"), tx("2026-09-02", -7000, "casa"), tx("2026-09-03", -1000, null)],
      categories,
      "2026-09",
    );
    expect(s.byCategory.map((c) => [c.name, c.expenseCents])).toEqual([
      ["Casa", 7000],
      ["Mercado", 5000],
      ["Sem categoria", 1000],
    ]);
    expect(s.byCategory[1].budgetCents).toBe(100000);
    expect(s.byCategory[2].categoryId).toBeNull();
  });

  it("shows up to five blocks: with exactly five categories the fifth keeps its own name", () => {
    const s = summarize(
      [
        tx("2026-09-01", -5000, "mercado"),
        tx("2026-09-01", -4000, "casa"),
        tx("2026-09-01", -3000, "lazer"),
        tx("2026-09-01", -2000, "saude"),
        tx("2026-09-01", -1000, "transporte"),
      ],
      categories,
      "2026-09",
    );
    expect(s.topCategories.map((c) => c.name)).toEqual(["Mercado", "Casa", "Lazer", "Saúde", "Transporte"]);
  });

  it("folds the sixth category onward into Outros", () => {
    const s = summarize(
      [
        tx("2026-09-01", -5000, "mercado"),
        tx("2026-09-01", -4000, "casa"),
        tx("2026-09-01", -3000, "lazer"),
        tx("2026-09-01", -2000, "saude"),
        tx("2026-09-01", -1000, "transporte"),
        tx("2026-09-01", -500, "compras"),
      ],
      categories,
      "2026-09",
    );
    expect(s.topCategories.map((c) => [c.name, c.expenseCents])).toEqual([
      ["Mercado", 5000],
      ["Casa", 4000],
      ["Lazer", 3000],
      ["Saúde", 2000],
      ["Outros", 1500],
    ]);
  });

  it("handles an empty month", () => {
    const s = summarize([], categories, "2026-02");
    expect(s.incomeCents).toBe(0);
    expect(s.expenseCents).toBe(0);
    expect(s.days).toHaveLength(28);
    expect(s.byCategory).toEqual([]);
    expect(s.topCategories).toEqual([]);
  });
});

describe("history6", () => {
  it("returns the six months ending at the given one, filling gaps with zero", () => {
    const h = history6(
      [
        { month: "2026-09", incomeCents: 500000, expenseCents: 300000 },
        { month: "2026-07", incomeCents: 400000, expenseCents: 350000 },
        { month: "2025-12", incomeCents: 1, expenseCents: 1 },
      ],
      "2026-09",
    );
    expect(h.map((m) => m.month)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(h[3]).toEqual({ month: "2026-07", incomeCents: 400000, expenseCents: 350000 });
    expect(h[4]).toEqual({ month: "2026-08", incomeCents: 0, expenseCents: 0 });
    expect(h[5].expenseCents).toBe(300000);
  });
});
