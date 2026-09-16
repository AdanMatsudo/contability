import { describe, expect, it } from "vitest";
import type { Transaction } from "@/domain/types";
import { applyTransactionFilter, parseTransactionFilter } from "./transaction-filter";

function tx(id: string, amountCents: number, description: string, categoryId: string | null): Transaction {
  return {
    id,
    date: "2026-09-10",
    amountCents,
    description,
    normalized: description.toUpperCase(),
    source: "MANUAL",
    categorizedBy: null,
    accountId: "acc",
    categoryId,
    importBatchId: null,
    recurringId: null,
  };
}

const items = [
  tx("1", -3240, "Padaria São José", "mercado"),
  tx("2", 500000, "Salário", "salario"),
  tx("3", -7800, "Cinemark", "lazer"),
  tx("4", -1500, "Estacionamento", null),
];

const ids = (list: Transaction[]) => list.map((t) => t.id);

describe("applyTransactionFilter", () => {
  it("keeps everything with the default filter", () => {
    expect(ids(applyTransactionFilter(items, { flow: "ALL", categoryId: undefined, q: "" }))).toEqual(["1", "2", "3", "4"]);
  });

  it("splits by flow using the sign", () => {
    expect(ids(applyTransactionFilter(items, { flow: "INCOME", categoryId: undefined, q: "" }))).toEqual(["2"]);
    expect(ids(applyTransactionFilter(items, { flow: "EXPENSE", categoryId: undefined, q: "" }))).toEqual(["1", "3", "4"]);
  });

  it("filters by category, with 'none' meaning uncategorized", () => {
    expect(ids(applyTransactionFilter(items, { flow: "ALL", categoryId: "lazer", q: "" }))).toEqual(["3"]);
    expect(ids(applyTransactionFilter(items, { flow: "ALL", categoryId: "none", q: "" }))).toEqual(["4"]);
  });

  it("searches the description ignoring accents and case", () => {
    expect(ids(applyTransactionFilter(items, { flow: "ALL", categoryId: undefined, q: "sao jose" }))).toEqual(["1"]);
  });
});

describe("parseTransactionFilter", () => {
  it("falls back to defaults on garbage", () => {
    expect(parseTransactionFilter({ flow: "x" })).toEqual({ flow: "ALL", categoryId: undefined, q: "" });
  });

  it("keeps valid values", () => {
    expect(parseTransactionFilter({ flow: "EXPENSE", category: "lazer", q: " cine " })).toEqual({
      flow: "EXPENSE",
      categoryId: "lazer",
      q: "cine",
    });
  });
});
