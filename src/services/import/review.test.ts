import { describe, expect, it } from "vitest";
import type { Decision } from "./confirm";
import type { ReviewRow } from "./prepare";
import type { Category } from "@/domain/types";
import { applyChoice, groupForReview, rulesToLearn, setLearn } from "./review";

function row(index: number, description: string, normalized: string, extra: Partial<ReviewRow> = {}): ReviewRow {
  return {
    index,
    date: "2026-09-10",
    amountCents: -1000,
    description,
    externalId: null,
    normalized,
    cnpj: null,
    ordinal: 0,
    importHash: `h${index}`,
    duplicate: false,
    included: true,
    categoryId: null,
    categorizedBy: null,
    ...extra,
  };
}

const rows: ReviewRow[] = [
  row(0, "Ifd*Kozuki Miyoshi Ca", "IFD KOZUKI MIYOSHI CA"),
  row(1, "Ifd*Pizzano Restaurant", "IFD PIZZANO RESTAURANT"),
  row(2, "Ifd*Djm Empreendimento", "IFD DJM EMPREENDIMENTO", { included: false }),
  row(3, "Uber Uber *Trip Help.U", "UBER UBER TRIP HELP U", { categoryId: "transporte", categorizedBy: "RULE", ruleId: "r1" }),
  row(4, "Comercio de Combustive", "COMERCIO DE COMBUSTIVE"),
];

const initial = (): Record<number, Decision> =>
  Object.fromEntries(rows.map((r) => [r.index, { index: r.index, included: r.included, categoryId: r.categoryId }]));

describe("applyChoice", () => {
  it("sets the category and a suggested pattern on the chosen row", () => {
    const next = applyChoice(rows, initial(), 0, "alimentacao");
    expect(next[0]).toEqual({ index: 0, included: true, categoryId: "alimentacao", pattern: "IFD", learn: true });
  });

  it("defaults to learning a rule from every choice; the user opts out of the few uncertain ones", () => {
    expect(applyChoice(rows, initial(), 0, "alimentacao")[0].learn).toBe(true);
    expect(applyChoice(rows, initial(), 4, "transporte")[4].learn).toBe(true);
  });

  it("propagated rows are categorized this once, without learning a second rule", () => {
    const next = applyChoice(rows, initial(), 0, "alimentacao");
    expect(next[1]).toMatchObject({ categoryId: "alimentacao", pattern: "IFD", learn: false });
  });

  it("setLearn toggles the flag on one row and its siblings sharing the pattern", () => {
    const chosen = applyChoice(rows, initial(), 0, "alimentacao");
    const off = setLearn(chosen, "IFD", false);
    expect(off[0].learn).toBe(false);
    expect(off[1].learn).toBe(false);
    const on = setLearn(off, "IFD", true);
    expect(on[0].learn).toBe(true);
    expect(on[1].learn).toBe(false);
  });

  it("rulesToLearn lists one entry per pattern the user opted into", () => {
    let d = applyChoice(rows, initial(), 0, "alimentacao");
    d = applyChoice(rows, d, 4, "transporte");
    expect(rulesToLearn(rows, d)).toEqual([
      { pattern: "IFD", categoryId: "alimentacao", rows: 2 },
      { pattern: "COMERCIO DE COMBUSTIVE", categoryId: "transporte", rows: 1 },
    ]);
    d = setLearn(d, "COMERCIO DE COMBUSTIVE", false);
    expect(rulesToLearn(rows, d)).toEqual([{ pattern: "IFD", categoryId: "alimentacao", rows: 2 }]);
  });

  it("propagates to other included rows without a category whose text contains the pattern", () => {
    const next = applyChoice(rows, initial(), 0, "alimentacao");
    expect(next[1]).toMatchObject({ categoryId: "alimentacao", pattern: "IFD" });
    expect(next[2].categoryId).toBeNull();
    expect(next[3].categoryId).toBe("transporte");
    expect(next[4].categoryId).toBeNull();
  });

  it("does not override a category the user already chose on another row", () => {
    const decisions = initial();
    decisions[1] = { ...decisions[1], categoryId: "lazer", pattern: "PIZZANO" };
    const next = applyChoice(rows, decisions, 0, "alimentacao");
    expect(next[1].categoryId).toBe("lazer");
  });

  it("uses an explicit pattern when given and propagates with it", () => {
    const next = applyChoice(rows, initial(), 4, "transporte", "COMBUSTIVE");
    expect(next[4]).toEqual({ index: 4, included: true, categoryId: "transporte", pattern: "COMBUSTIVE", learn: true });
  });

  it("clearing the category clears the pattern and touches no other row", () => {
    const chosen = applyChoice(rows, initial(), 0, "alimentacao");
    const cleared = applyChoice(rows, chosen, 0, null);
    expect(cleared[0]).toEqual({ index: 0, included: true, categoryId: null, pattern: undefined, learn: false });
    expect(cleared[1].categoryId).toBe("alimentacao");
  });
});

describe("groupForReview", () => {
  const categories: Category[] = [
    { id: "alimentacao", name: "Alimentação fora", kind: "EXPENSE", budgetCents: null, color: "#a" },
    { id: "transporte", name: "Transporte", kind: "EXPENSE", budgetCents: null, color: "#t" },
    { id: "lazer", name: "Lazer", kind: "EXPENSE", budgetCents: null, color: "#l" },
  ];
  const data: ReviewRow[] = [
    row(0, "Ifd*Kozuki", "IFD KOZUKI", { amountCents: -5490, date: "2026-09-15" }),
    row(1, "Ifd*Pizzano", "IFD PIZZANO", { amountCents: -3000, date: "2026-09-13" }),
    row(2, "Uber", "UBER", { amountCents: -2000, categoryId: "transporte", categorizedBy: "RULE", date: "2026-09-14" }),
    row(3, "Pagamento recebido", "PAGAMENTO RECEBIDO", { amountCents: 250000, date: "2026-09-03" }),
    row(4, "Mensuremarketfor", "MENSUREMARKETFOR", { amountCents: -1000, date: "2026-09-12" }),
    row(5, "Old", "OLD", { amountCents: -9999, duplicate: true, included: false }),
    row(6, "Skip", "SKIP", { amountCents: -777, included: false }),
  ];
  let decisions: Record<number, Decision> = Object.fromEntries(
    data.map((r) => [r.index, { index: r.index, included: r.included, categoryId: r.categoryId }]),
  );
  decisions = applyChoice(data, decisions, 0, "alimentacao");

  it("puts uncategorized first, then categories by expense total, with subtotals of included rows only", () => {
    const groups = groupForReview(data, decisions, categories);
    expect(groups.map((g) => [g.name, g.rows.map((r) => r.index), g.expenseCents])).toEqual([
      ["Sem categoria", [4, 3], 1000],
      ["Alimentação fora", [0, 1], 8490],
      ["Transporte", [2], 2000],
      ["Fora da importação", [5, 6], 0],
    ]);
  });

  it("orders rows by date descending inside a group and exposes color and income", () => {
    const groups = groupForReview(data, decisions, categories);
    expect(groups[1].rows.map((r) => r.date)).toEqual(["2026-09-15", "2026-09-13"]);
    expect(groups[1].color).toBe("#a");
    expect(groups[0].incomeCents).toBe(250000);
  });
});

