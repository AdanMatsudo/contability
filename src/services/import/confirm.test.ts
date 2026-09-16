import { describe, expect, it } from "vitest";
import type { Rule } from "@/domain/types";
import { buildConfirmPlan } from "./confirm";
import type { ReviewRow } from "./prepare";

const rules: Rule[] = [
  { id: "r1", pattern: "UBER", categoryId: "transporte", hits: 1 },
  { id: "r2", pattern: "PADARIA SAO JOSE", categoryId: "alimentacao", hits: 0 },
];

function row(index: number, normalized: string, extra: Partial<ReviewRow> = {}): ReviewRow {
  return {
    index,
    date: "2026-09-10",
    amountCents: -1000,
    description: `raw ${normalized}`,
    externalId: `ext${index}`,
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

describe("buildConfirmPlan", () => {
  it("skips duplicates and rows the user excluded", () => {
    const plan = buildConfirmPlan(
      [row(0, "A", { duplicate: true, included: false }), row(1, "B", { included: false }), row(2, "C")],
      [
        { index: 0, included: false, categoryId: null },
        { index: 1, included: false, categoryId: null },
        { index: 2, included: true, categoryId: null },
      ],
      rules,
      "acc_1",
    );
    expect(plan.transactions.map((t) => t.importHash)).toEqual(["h2"]);
    expect(plan.counts).toEqual({ rows: 3, imported: 1, duplicates: 1, excluded: 1 });
  });

  it("builds transactions with source IMPORT, the account and the user's final category", () => {
    const plan = buildConfirmPlan(
      [row(0, "UBER TRIP", { categoryId: "transporte", categorizedBy: "RULE", ruleId: "r1" })],
      [{ index: 0, included: true, categoryId: "transporte" }],
      rules,
      "acc_1",
    );
    expect(plan.transactions[0]).toEqual({
      date: "2026-09-10",
      amountCents: -1000,
      description: "raw UBER TRIP",
      normalized: "UBER TRIP",
      source: "IMPORT",
      categorizedBy: "RULE",
      accountId: "acc_1",
      categoryId: "transporte",
      importHash: "h0",
      externalId: "ext0",
    });
  });

  it("counts a hit for rules the user accepted unchanged", () => {
    const plan = buildConfirmPlan(
      [row(0, "UBER TRIP", { categoryId: "transporte", categorizedBy: "RULE", ruleId: "r1" })],
      [{ index: 0, included: true, categoryId: "transporte" }],
      rules,
      "acc_1",
    );
    expect(plan.hitRuleIds).toEqual(["r1"]);
    expect(plan.newRules).toEqual([]);
  });

  it("learns a rule only when the user asked for it", () => {
    const opted = buildConfirmPlan([row(0, "CINEMARK")], [{ index: 0, included: true, categoryId: "lazer", learn: true }], rules, "acc_1");
    expect(opted.newRules).toEqual([{ pattern: "CINEMARK", categoryId: "lazer" }]);
    expect(opted.transactions[0].categorizedBy).toBe("MANUAL");

    const justThisOnce = buildConfirmPlan([row(0, "CINEMARK")], [{ index: 0, included: true, categoryId: "lazer" }], rules, "acc_1");
    expect(justThisOnce.newRules).toEqual([]);
    expect(justThisOnce.transactions[0]).toMatchObject({ categoryId: "lazer", categorizedBy: "MANUAL" });
  });

  it("learns a rule when the user changed the suggestion, and marks the row MANUAL", () => {
    const plan = buildConfirmPlan(
      [row(0, "UBER EATS", { categoryId: "transporte", categorizedBy: "RULE", ruleId: "r1" })],
      [{ index: 0, included: true, categoryId: "alimentacao", learn: true }],
      rules,
      "acc_1",
    );
    expect(plan.newRules).toEqual([{ pattern: "UBER EATS", categoryId: "alimentacao" }]);
    expect(plan.hitRuleIds).toEqual([]);
    expect(plan.transactions[0].categorizedBy).toBe("MANUAL");
  });

  it("does not learn from a suggestion the user merely kept, nor from rows left uncategorized", () => {
    const plan = buildConfirmPlan(
      [row(0, "DROGARIA", { categoryId: "saude", categorizedBy: "CNPJ" }), row(1, "XYZ")],
      [
        { index: 0, included: true, categoryId: "saude" },
        { index: 1, included: true, categoryId: null },
      ],
      rules,
      "acc_1",
    );
    expect(plan.newRules).toEqual([]);
    expect(plan.transactions[0].categorizedBy).toBe("CNPJ");
    expect(plan.transactions[1]).toMatchObject({ categoryId: null, categorizedBy: null });
  });

  it("does not duplicate a pattern that already exists or repeats within the file", () => {
    const plan = buildConfirmPlan(
      [row(0, "PADARIA SAO JOSE"), row(1, "CINEMARK"), row(2, "CINEMARK")],
      [
        { index: 0, included: true, categoryId: "mercado", learn: true },
        { index: 1, included: true, categoryId: "lazer", learn: true },
        { index: 2, included: true, categoryId: "lazer", learn: true },
      ],
      rules,
      "acc_1",
    );
    expect(plan.newRules).toEqual([{ pattern: "CINEMARK", categoryId: "lazer" }]);
  });

  it("ignores decisions for unknown indexes", () => {
    const plan = buildConfirmPlan([row(0, "A")], [{ index: 7, included: true, categoryId: "x" }], rules, "acc_1");
    expect(plan.transactions).toHaveLength(0);
  });

  it("learns the pattern the user typed instead of the whole text, once per pattern", () => {
    const plan = buildConfirmPlan(
      [row(0, "IFD KOZUKI MIYOSHI CA"), row(1, "IFD PIZZANO RESTAURANT"), row(2, "COMERCIO DE COMBUSTIVE")],
      [
        { index: 0, included: true, categoryId: "alimentacao", pattern: "IFD", learn: true },
        { index: 1, included: true, categoryId: "alimentacao", pattern: "IFD", learn: true },
        { index: 2, included: true, categoryId: "transporte", pattern: "  combustive ", learn: true },
      ],
      rules,
      "acc_1",
    );
    expect(plan.newRules).toEqual([
      { pattern: "IFD", categoryId: "alimentacao" },
      { pattern: "COMBUSTIVE", categoryId: "transporte" },
    ]);
  });

  it("ignores an empty pattern and falls back to the normalized text", () => {
    const plan = buildConfirmPlan([row(0, "CINEMARK")], [{ index: 0, included: true, categoryId: "lazer", pattern: "   ", learn: true }], rules, "acc_1");
    expect(plan.newRules).toEqual([{ pattern: "CINEMARK", categoryId: "lazer" }]);
  });
});
