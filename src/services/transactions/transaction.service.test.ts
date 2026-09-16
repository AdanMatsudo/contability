import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { buildFromManual } from "./transaction.service";

const base = {
  kind: "EXPENSE" as const,
  amount: "32,40",
  date: "2026-09-13",
  description: "  Padaria São José  ",
  accountId: "acc_1",
  categoryId: "cat_1",
};

describe("buildFromManual", () => {
  it("builds a negative expense with normalized description", () => {
    expect(buildFromManual(base)).toEqual({
      date: "2026-09-13",
      amountCents: -3240,
      description: "Padaria São José",
      normalized: "PADARIA SAO JOSE",
      source: "MANUAL",
      categorizedBy: "MANUAL",
      accountId: "acc_1",
      categoryId: "cat_1",
    });
  });

  it("builds a positive income and accepts BRL formats", () => {
    expect(buildFromManual({ ...base, kind: "INCOME", amount: "R$ 5.000,00" }).amountCents).toBe(500000);
  });

  it("ignores a minus sign typed by the user; the kind decides the sign", () => {
    expect(buildFromManual({ ...base, amount: "-10,00" }).amountCents).toBe(-1000);
  });

  it("leaves categorizedBy null when there is no category", () => {
    const tx = buildFromManual({ ...base, categoryId: null });
    expect(tx.categoryId).toBeNull();
    expect(tx.categorizedBy).toBeNull();
  });

  it("rejects zero, garbage and empty amounts on the amount field", () => {
    for (const amount of ["0", "abc", ""]) {
      try {
        buildFromManual({ ...base, amount });
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).fieldErrors?.amount?.[0]).toBeTruthy();
      }
    }
  });

  it("rejects an invalid or malformed date on the date field", () => {
    for (const date of ["2026-02-30", "13/09/2026", ""]) {
      try {
        buildFromManual({ ...base, date });
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).fieldErrors?.date?.[0]).toBeTruthy();
      }
    }
  });

  it("rejects an empty description and reports every failing field at once", () => {
    try {
      buildFromManual({ ...base, description: "   ", amount: "x" });
      throw new Error("should have thrown");
    } catch (err) {
      const fields = (err as ValidationError).fieldErrors ?? {};
      expect(Object.keys(fields).sort()).toEqual(["amount", "description"]);
    }
  });
});
