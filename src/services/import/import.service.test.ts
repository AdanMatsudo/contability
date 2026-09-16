import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeStatement } from "@/adapters/parsers/csv";
import type { Rule } from "@/domain/types";
import { confirmImport, prepareImport, type PrepareDeps } from "./import.service";

const text = (name: string) => decodeStatement(new Uint8Array(readFileSync(`tests/fixtures/${name}`)));

const rules: Rule[] = [
  { id: "r-uber", pattern: "UBER", categoryId: "transporte", hits: 3 },
  { id: "r-fatura", pattern: "PAGAMENTO DE FATURA", categoryId: "transfer", hits: 1 },
];

function deps(overrides: Partial<PrepareDeps> = {}): PrepareDeps {
  return {
    rules,
    existingHashes: async () => new Set<string>(),
    findMapping: async () => null,
    ...overrides,
  };
}

describe("prepareImport", () => {
  it("detects the Nubank account CSV, prepares rows and applies rules", async () => {
    const result = await prepareImport({ text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" }, deps());
    expect(result.format).toBe("nubank-account-csv");
    expect(result.needsMapping).toBe(false);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[2]).toMatchObject({ normalized: "PAGAMENTO DE FATURA", categoryId: "transfer", categorizedBy: "RULE" });
    expect(result.rows[3]).toMatchObject({ categoryId: "transporte", ruleId: "r-uber", ordinal: 0 });
    expect(result.rows[4]).toMatchObject({ categoryId: "transporte", ordinal: 1 });
    expect(result.rows[0].categoryId).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("marks duplicates from the existing hashes", async () => {
    const first = await prepareImport({ text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" }, deps());
    const known = new Set([first.rows[0].importHash, first.rows[1].importHash]);
    const again = await prepareImport(
      { text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" },
      deps({ existingHashes: async () => known }),
    );
    expect(again.rows.map((r) => r.duplicate)).toEqual([true, true, false, false, false]);
    expect(again.rows[0].included).toBe(false);
  });

  it("asks for a column mapping on an unknown CSV and remembers one when saved before", async () => {
    const unknown = await prepareImport({ text: text("unknown.csv"), fileName: "x.csv", accountId: "acc" }, deps());
    expect(unknown.format).toBe("generic-csv");
    expect(unknown.needsMapping).toBe(true);
    expect(unknown.headers).toEqual(["Quando", "Quanto", "Onde"]);
    expect(unknown.preview).toHaveLength(2);
    expect(unknown.signature).toBe("onde|quando|quanto");
    expect(unknown.rows).toEqual([]);

    const mapping = { date: "Quando", amount: "Quanto", description: "Onde", dateFormat: "dmy" as const, invertSign: false };
    const remembered = await prepareImport(
      { text: text("unknown.csv"), fileName: "x.csv", accountId: "acc" },
      deps({ findMapping: async () => mapping }),
    );
    expect(remembered.needsMapping).toBe(false);
    expect(remembered.rows).toHaveLength(2);
    expect(remembered.rows[0].amountCents).toBe(-1050);
  });

  it("uses a mapping passed explicitly over the remembered one", async () => {
    const mapping = { date: "Quando", amount: "Quanto", description: "Onde", dateFormat: "dmy" as const, invertSign: true };
    const result = await prepareImport({ text: text("unknown.csv"), fileName: "x.csv", accountId: "acc", mapping }, deps());
    expect(result.rows[0].amountCents).toBe(1050);
  });

  it("reports an unknown format with no rows", async () => {
    const result = await prepareImport({ text: "hello world", fileName: "x.txt", accountId: "acc" }, deps());
    expect(result.format).toBe("unknown");
    expect(result.rows).toEqual([]);
    expect(result.needsMapping).toBe(false);
  });

  it("passes cascade warnings through", async () => {
    const result = await prepareImport(
      { text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" },
      deps({
        byCnpj: async () => {
          throw new Error("down");
        },
      }),
    );
    expect(result.warnings).toHaveLength(1);
  });
});

describe("confirmImport", () => {
  it("builds the plan from the decisions and hands it to commit", async () => {
    const prepared = await prepareImport({ text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" }, deps());
    const decisions = prepared.rows.map((r) => ({
      index: r.index,
      included: r.index !== 1,
      categoryId: r.index === 0 ? "mercado" : r.categoryId,
      learn: r.index === 0,
    }));
    let committed: unknown = null;
    const result = await confirmImport(
      { rows: prepared.rows, decisions, accountId: "acc", fileName: "conta.csv" },
      {
        rules,
        commit: async (input) => {
          committed = input;
          return { batchId: "b1", importedCount: input.plan.transactions.length, learnedRules: input.plan.newRules.length };
        },
      },
    );
    expect(result).toEqual({
      batchId: "b1",
      importedCount: 4,
      duplicateCount: 0,
      excludedCount: 1,
      learnedRules: [{ pattern: "COMPRA NO DEBITO PADARIA SAO JOSE", categoryId: "mercado" }],
    });
    expect(committed).toMatchObject({ accountId: "acc", fileName: "conta.csv" });
  });

  it("refuses when an included row still has no category", async () => {
    const prepared = await prepareImport({ text: text("nubank-conta.csv"), fileName: "conta.csv", accountId: "acc" }, deps());
    const decisions = prepared.rows.map((r) => ({ index: r.index, included: true, categoryId: r.categoryId }));
    await expect(
      confirmImport({ rows: prepared.rows, decisions, accountId: "acc", fileName: "conta.csv" }, { rules, commit: async () => ({ batchId: "b", importedCount: 0, learnedRules: 0 }) }),
    ).rejects.toThrow(/sem categoria/);
  });
});
