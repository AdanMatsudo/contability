import { describe, expect, it } from "vitest";
import type { Rule } from "@/domain/types";
import type { ReviewRow } from "@/services/import/prepare";
import { categorizeRows } from "./cascade";

const rules: Rule[] = [{ id: "r1", pattern: "UBER", categoryId: "transporte", hits: 1 }];

function row(index: number, normalized: string, extra: Partial<ReviewRow> = {}): ReviewRow {
  return {
    index,
    date: "2026-09-10",
    amountCents: -1000,
    description: normalized,
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

describe("categorizeRows", () => {
  it("applies rules first and records who decided", async () => {
    const { rows, warnings } = await categorizeRows([row(0, "UBER TRIP"), row(1, "PADARIA")], { rules });
    expect(rows[0]).toMatchObject({ categoryId: "transporte", categorizedBy: "RULE", ruleId: "r1" });
    expect(rows[1]).toMatchObject({ categoryId: null, categorizedBy: null });
    expect(warnings).toEqual([]);
  });

  it("asks the CNPJ stage only for rows still without category and with a CNPJ", async () => {
    const asked: string[][] = [];
    const byCnpj = async (cnpjs: string[]) => {
      asked.push(cnpjs);
      return new Map([["11111111000111", { categoryId: "saude", razaoSocial: "DROGARIA SAO PAULO SA" }]]);
    };
    const { rows } = await categorizeRows(
      [row(0, "UBER TRIP", { cnpj: "22222222000122" }), row(1, "DROGARIA", { cnpj: "11111111000111" }), row(2, "PADARIA")],
      { rules, byCnpj },
    );
    expect(asked).toEqual([["11111111000111"]]);
    expect(rows[1]).toMatchObject({ categoryId: "saude", categorizedBy: "CNPJ", razaoSocial: "DROGARIA SAO PAULO SA" });
    expect(rows[2].categoryId).toBeNull();
  });

  it("keeps the company name even when the CNAE maps to no category", async () => {
    const byCnpj = async () => new Map([["11111111000111", { categoryId: null, razaoSocial: "CLINICA X LTDA" }]]);
    const { rows } = await categorizeRows([row(0, "CLINICA", { cnpj: "11111111000111" })], { rules, byCnpj });
    expect(rows[0]).toMatchObject({ categoryId: null, categorizedBy: null, razaoSocial: "CLINICA X LTDA" });
  });

  it("asks the AI stage last, only for what is left, and records AI", async () => {
    const byAi = async (normalized: string[]) => new Map(normalized.map((n) => [n, n === "PADARIA" ? "alimentacao" : null]));
    const { rows } = await categorizeRows([row(0, "UBER TRIP"), row(1, "PADARIA"), row(2, "XYZ")], { rules, byAi });
    expect(rows[1]).toMatchObject({ categoryId: "alimentacao", categorizedBy: "AI" });
    expect(rows[2]).toMatchObject({ categoryId: null, categorizedBy: null });
  });

  it("skips duplicates entirely", async () => {
    const { rows } = await categorizeRows([row(0, "UBER TRIP", { duplicate: true, included: false })], { rules });
    expect(rows[0].categoryId).toBeNull();
  });

  it("turns a failing stage into a warning and keeps going", async () => {
    const byCnpj = async () => {
      throw new Error("ECONNRESET");
    };
    const byAi = async (normalized: string[]) => new Map(normalized.map((n) => [n, "alimentacao"]));
    const { rows, warnings } = await categorizeRows([row(0, "PADARIA", { cnpj: "11111111000111" })], { rules, byCnpj, byAi });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("CNPJ");
    expect(rows[0]).toMatchObject({ categoryId: "alimentacao", categorizedBy: "AI" });
  });

  it("does not call a stage when no row needs it", async () => {
    let called = false;
    const byAi = async () => {
      called = true;
      return new Map<string, string | null>();
    };
    await categorizeRows([row(0, "UBER TRIP")], { rules, byAi });
    expect(called).toBe(false);
  });
});
