import { describe, expect, it } from "vitest";
import { parseBudget, pickColor, validateCategoryName } from "./category.service";

const existing = [
  { id: "c1", name: "Mercado" },
  { id: "c2", name: "Alimentação fora" },
];

describe("validateCategoryName", () => {
  it("accepts a new trimmed name", () => {
    expect(validateCategoryName("  Transporte ", existing)).toEqual({ ok: true, name: "Transporte" });
  });

  it("rejects empty names", () => {
    expect(validateCategoryName("   ", existing)).toEqual({ ok: false, error: "Dê um nome à categoria." });
  });

  it("rejects names longer than 40 characters", () => {
    expect(validateCategoryName("x".repeat(41), existing).ok).toBe(false);
  });

  it("rejects duplicates ignoring case, accents and spacing", () => {
    expect(validateCategoryName("mercado", existing).ok).toBe(false);
    expect(validateCategoryName("MÉRCADO", existing).ok).toBe(false);
    expect(validateCategoryName("Alimentacao  fora", existing).ok).toBe(false);
  });

  it("lets a category keep its own name on edit", () => {
    expect(validateCategoryName("Mercado", existing, "c1")).toEqual({ ok: true, name: "Mercado" });
    expect(validateCategoryName("Mercado", existing, "c2").ok).toBe(false);
  });
});

describe("parseBudget", () => {
  it("returns null for an empty budget (no limit)", () => {
    expect(parseBudget("")).toEqual({ ok: true, budgetCents: null });
    expect(parseBudget("   ")).toEqual({ ok: true, budgetCents: null });
  });

  it("parses BRL input into cents", () => {
    expect(parseBudget("R$ 1.200,00")).toEqual({ ok: true, budgetCents: 120000 });
    expect(parseBudget("800")).toEqual({ ok: true, budgetCents: 80000 });
  });

  it("rejects zero, negatives and garbage", () => {
    expect(parseBudget("0").ok).toBe(false);
    expect(parseBudget("-10").ok).toBe(false);
    expect(parseBudget("abc").ok).toBe(false);
  });
});

describe("pickColor", () => {
  it("returns the first palette color not in use", () => {
    const first = pickColor([]);
    const second = pickColor([first]);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("falls back to the least used color when the palette is exhausted", () => {
    const used: string[] = [];
    for (let i = 0; i < 20; i++) used.push(pickColor(used));
    const counts = new Map<string, number>();
    used.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    const values = [...counts.values()];
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });
});
