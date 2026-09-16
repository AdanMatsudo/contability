import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { accountsForFlow, assertAccountRemovable, validateAccountName } from "./account.service";

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

describe("accountsForFlow", () => {
  const accounts = [
    { id: "a1", name: "Nubank · conta", type: "CHECKING" as const },
    { id: "a2", name: "Nubank · cartão", type: "CREDIT_CARD" as const },
    { id: "a3", name: "Dinheiro", type: "CASH" as const },
  ];

  it("offers every account for an expense", () => {
    expect(accountsForFlow(accounts, "EXPENSE").map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("leaves credit cards out for an income", () => {
    expect(accountsForFlow(accounts, "INCOME").map((a) => a.id)).toEqual(["a1", "a3"]);
  });
});
