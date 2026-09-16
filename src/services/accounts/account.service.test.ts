import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { assertAccountRemovable, validateAccountName } from "./account.service";

const existing = [
  { id: "a1", name: "Nubank · conta" },
  { id: "a2", name: "Dinheiro" },
];

describe("validateAccountName", () => {
  it("accepts a new trimmed name", () => {
    expect(validateAccountName("  Inter ", existing)).toEqual({ ok: true, name: "Inter" });
  });

  it("rejects duplicates ignoring case and accents", () => {
    expect(validateAccountName("dinheiro", existing).ok).toBe(false);
  });

  it("lets an account keep its own name on edit", () => {
    expect(validateAccountName("Dinheiro", existing, "a2")).toEqual({ ok: true, name: "Dinheiro" });
  });
});

describe("assertAccountRemovable", () => {
  it("passes when the account has no transactions", () => {
    expect(() => assertAccountRemovable(0)).not.toThrow();
  });

  it("throws a ConflictError naming the count when transactions exist", () => {
    expect(() => assertAccountRemovable(3)).toThrow(ConflictError);
    expect(() => assertAccountRemovable(3)).toThrow("Esta conta tem 3 lançamentos. Mova ou apague antes.");
  });
});
