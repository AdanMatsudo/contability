import { describe, expect, it } from "vitest";
import type { Account } from "@/domain/types";
import { suggestAccount } from "./account-suggest";

const accounts: Account[] = [
  { id: "cash", name: "Dinheiro", type: "CASH" },
  { id: "card", name: "Nubank · cartão", type: "CREDIT_CARD" },
  { id: "checking", name: "Nubank · conta", type: "CHECKING" },
];

describe("suggestAccount", () => {
  it("points a card export at the credit card account", () => {
    expect(suggestAccount("nubank-card-csv", accounts, "cash")).toBe("card");
  });

  it("points an account export or OFX at the checking account", () => {
    expect(suggestAccount("nubank-account-csv", accounts, "cash")).toBe("checking");
    expect(suggestAccount("ofx", accounts, "card")).toBe("checking");
  });

  it("returns null when the current account already fits or nothing better exists", () => {
    expect(suggestAccount("nubank-card-csv", accounts, "card")).toBeNull();
    expect(suggestAccount("generic-csv", accounts, "cash")).toBeNull();
    expect(suggestAccount("nubank-card-csv", [accounts[0]], "cash")).toBeNull();
  });
});
