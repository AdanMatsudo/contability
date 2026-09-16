import { describe, expect, it } from "vitest";
import type { ParsedRow } from "@/adapters/parsers/types";
import { extractCnpj, markDuplicates, prepareRows } from "./prepare";

const parsed: ParsedRow[] = [
  { date: "2026-09-01", amountCents: -3240, description: "Compra no débito - PADARIA SAO JOSE 123", externalId: "a" },
  { date: "2026-09-05", amountCents: 500000, description: "Pix - EMPRESA XPTO LTDA - 12.345.678/0001-90", externalId: "b" },
  { date: "2026-09-10", amountCents: -8990, description: "Compra no débito - UBER *TRIP", externalId: "c" },
  { date: "2026-09-10", amountCents: -8990, description: "Compra no débito - UBER *TRIP", externalId: "d" },
];

describe("extractCnpj", () => {
  it("finds a formatted or bare CNPJ in the raw description", () => {
    expect(extractCnpj("Pix - EMPRESA XPTO LTDA - 12.345.678/0001-90")).toBe("12345678000190");
    expect(extractCnpj("PAG 12345678000190 LOJA")).toBe("12345678000190");
  });

  it("returns null when there is none", () => {
    expect(extractCnpj("UBER *TRIP 123")).toBeNull();
  });
});

describe("prepareRows", () => {
  const rows = prepareRows(parsed, "acc_1");

  it("keeps the order and indexes the rows", () => {
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("normalizes the description and extracts the CNPJ from the raw text", () => {
    expect(rows[0].normalized).toBe("COMPRA NO DEBITO PADARIA SAO JOSE");
    expect(rows[1].cnpj).toBe("12345678000190");
    expect(rows[0].cnpj).toBeNull();
  });

  it("gives identical rows increasing ordinals and therefore different hashes", () => {
    expect(rows[2].ordinal).toBe(0);
    expect(rows[3].ordinal).toBe(1);
    expect(rows[2].importHash).not.toBe(rows[3].importHash);
    expect(rows[2].importHash).toMatch(/^[0-9a-f]{40}$/);
  });

  it("is deterministic for the same account", () => {
    expect(prepareRows(parsed, "acc_1")[0].importHash).toBe(rows[0].importHash);
    expect(prepareRows(parsed, "acc_2")[0].importHash).not.toBe(rows[0].importHash);
  });
});

describe("markDuplicates", () => {
  it("flags rows whose hash already exists and leaves the rest included", () => {
    const rows = prepareRows(parsed, "acc_1");
    const review = markDuplicates(rows, new Set([rows[1].importHash]));
    expect(review.map((r) => r.duplicate)).toEqual([false, true, false, false]);
    expect(review.map((r) => r.included)).toEqual([true, false, true, true]);
    expect(review[0].categoryId).toBeNull();
    expect(review[0].categorizedBy).toBeNull();
  });
});
