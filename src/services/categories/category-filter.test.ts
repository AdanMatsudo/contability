import { describe, expect, it } from "vitest";
import { filterAndSort, matchRange, parseCategoryFilter, type CategoryWithUsage } from "./category-filter";

const items: CategoryWithUsage[] = [
  { id: "1", name: "Mercado", kind: "EXPENSE", budgetCents: 120000, color: "#1", usageCount: 14 },
  { id: "2", name: "Alimentação fora", kind: "EXPENSE", budgetCents: 60000, color: "#2", usageCount: 9 },
  { id: "3", name: "Casa", kind: "EXPENSE", budgetCents: 200000, color: "#3", usageCount: 3 },
  { id: "4", name: "Transporte", kind: "EXPENSE", budgetCents: null, color: "#4", usageCount: 9 },
  { id: "5", name: "Salário", kind: "INCOME", budgetCents: null, color: "#5", usageCount: 2 },
  { id: "6", name: "Transferência", kind: "TRANSFER", budgetCents: null, color: "#6", usageCount: 0 },
];

const names = (list: CategoryWithUsage[]) => list.map((c) => c.name);

describe("filterAndSort", () => {
  it("sorts by name in pt-BR order by default", () => {
    const out = filterAndSort(items, { q: "", kind: "ALL", sort: "name" });
    expect(names(out)).toEqual(["Alimentação fora", "Casa", "Mercado", "Salário", "Transferência", "Transporte"]);
  });

  it("filters by kind", () => {
    const out = filterAndSort(items, { q: "", kind: "INCOME", sort: "name" });
    expect(names(out)).toEqual(["Salário"]);
  });

  it("searches ignoring case and accents", () => {
    expect(names(filterAndSort(items, { q: "alimentacao", kind: "ALL", sort: "name" }))).toEqual(["Alimentação fora"]);
    expect(names(filterAndSort(items, { q: "TRANS", kind: "ALL", sort: "name" }))).toEqual([
      "Transferência",
      "Transporte",
    ]);
  });

  it("combines search and kind", () => {
    expect(names(filterAndSort(items, { q: "trans", kind: "EXPENSE", sort: "name" }))).toEqual(["Transporte"]);
  });

  it("sorts by budget descending with no-budget last, ties by name", () => {
    const out = filterAndSort(items, { q: "", kind: "EXPENSE", sort: "budget" });
    expect(names(out)).toEqual(["Casa", "Mercado", "Alimentação fora", "Transporte"]);
  });

  it("sorts by usage descending, ties by name", () => {
    const out = filterAndSort(items, { q: "", kind: "EXPENSE", sort: "usage" });
    expect(names(out)).toEqual(["Mercado", "Alimentação fora", "Transporte", "Casa"]);
  });

  it("does not mutate the input", () => {
    const copy = [...items];
    filterAndSort(items, { q: "", kind: "ALL", sort: "usage" });
    expect(items).toEqual(copy);
  });
});

describe("matchRange", () => {
  it("returns the matched slice in the original string, accent-insensitive", () => {
    expect(matchRange("Alimentação fora", "alimentacao")).toEqual([0, 11]);
    expect(matchRange("Farmácia", "MAC")).toEqual([3, 6]);
  });

  it("returns null when there is no match or no query", () => {
    expect(matchRange("Mercado", "xyz")).toBeNull();
    expect(matchRange("Mercado", "")).toBeNull();
    expect(matchRange("Mercado", "   ")).toBeNull();
  });
});

describe("parseCategoryFilter", () => {
  it("falls back to safe defaults", () => {
    expect(parseCategoryFilter({})).toEqual({ q: "", kind: "ALL", sort: "name" });
    expect(parseCategoryFilter({ kind: "bogus", sort: "nope" })).toEqual({ q: "", kind: "ALL", sort: "name" });
  });

  it("keeps valid values and trims the query", () => {
    expect(parseCategoryFilter({ q: "  casa ", kind: "EXPENSE", sort: "usage" })).toEqual({
      q: "casa",
      kind: "EXPENSE",
      sort: "usage",
    });
  });
});
