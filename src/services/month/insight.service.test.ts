import { describe, expect, it } from "vitest";
import { buildInsight } from "./insight.service";
import type { MonthSummary } from "./month.service";

function summary(
  month: string,
  expenseCents: number,
  byCategory: { name: string; expenseCents: number; budgetCents?: number | null }[],
): MonthSummary {
  return {
    month,
    incomeCents: 0,
    expenseCents,
    balanceCents: -expenseCents,
    days: [],
    byCategory: byCategory.map((c, i) => ({
      categoryId: `c${i}`,
      name: c.name,
      color: "#000",
      expenseCents: c.expenseCents,
      budgetCents: c.budgetCents ?? null,
    })),
    topCategories: [],
  };
}

describe("buildInsight", () => {
  it("says so when there are no expenses", () => {
    expect(buildInsight(summary("2026-09", 0, []), null)).toBe("Nenhuma saída registrada em setembro.");
  });

  it("without a previous month, states the total and the top category", () => {
    const s = summary("2026-09", 150000, [
      { name: "Mercado", expenseCents: 90000 },
      { name: "Casa", expenseCents: 60000 },
    ]);
    expect(buildInsight(s, null)).toBe("Você gastou R$ 1.500,00 em setembro, mais em Mercado (R$ 900,00).");
  });

  it("treats a previous month with zero expenses like no previous month", () => {
    const s = summary("2026-09", 1000, [{ name: "Casa", expenseCents: 1000 }]);
    expect(buildInsight(s, summary("2026-08", 0, []))).toBe("Tudo foi em Casa (R$ 10,00).");
  });

  it("reports a rise versus the previous month, naming the top category", () => {
    const s = summary("2026-09", 112000, [
      { name: "Mercado", expenseCents: 70000 },
      { name: "Casa", expenseCents: 42000 },
    ]);
    expect(buildInsight(s, summary("2026-08", 100000, []))).toBe(
      "Saídas subiram 12% em relação a agosto, puxadas por Mercado (R$ 700,00).",
    );
  });

  it("reports a fall versus the previous month", () => {
    const s = summary("2026-09", 92000, [
      { name: "Mercado", expenseCents: 50000 },
      { name: "Casa", expenseCents: 42000 },
    ]);
    expect(buildInsight(s, summary("2026-08", 100000, []))).toBe("Saídas caíram 8% em relação a agosto.");
  });

  it("calls it stable within one percent", () => {
    const s = summary("2026-09", 100500, [
      { name: "Mercado", expenseCents: 60000 },
      { name: "Casa", expenseCents: 40500 },
    ]);
    expect(buildInsight(s, summary("2026-08", 100000, []))).toBe("Saídas ficaram no mesmo nível de agosto.");
  });

  it("with a single category, says everything went there", () => {
    const s = summary("2026-09", 30000, [{ name: "Casa", expenseCents: 30000 }]);
    expect(buildInsight(s, null)).toBe("Tudo foi em Casa (R$ 300,00).");
  });

  it("appends one, two, or three-plus over-budget categories with pt-BR joins", () => {
    const one = summary("2026-09", 30000, [{ name: "Lazer", expenseCents: 30000, budgetCents: 20000 }]);
    expect(buildInsight(one, null)).toBe("Tudo foi em Lazer (R$ 300,00). Lazer estourou o orçamento.");

    const two = summary("2026-09", 50000, [
      { name: "Lazer", expenseCents: 30000, budgetCents: 20000 },
      { name: "Mercado", expenseCents: 20000, budgetCents: 10000 },
    ]);
    expect(buildInsight(two, null)).toBe(
      "Você gastou R$ 500,00 em setembro, mais em Lazer (R$ 300,00). Lazer e Mercado estouraram o orçamento.",
    );

    const three = summary("2026-09", 60000, [
      { name: "Lazer", expenseCents: 30000, budgetCents: 20000 },
      { name: "Mercado", expenseCents: 20000, budgetCents: 10000 },
      { name: "Casa", expenseCents: 10000, budgetCents: 5000 },
    ]);
    expect(buildInsight(three, null)).toContain("Lazer, Mercado e Casa estouraram o orçamento.");
  });

  it("does not flag a category exactly at its budget", () => {
    const s = summary("2026-09", 20000, [{ name: "Lazer", expenseCents: 20000, budgetCents: 20000 }]);
    expect(buildInsight(s, null)).toBe("Tudo foi em Lazer (R$ 200,00).");
  });
});
