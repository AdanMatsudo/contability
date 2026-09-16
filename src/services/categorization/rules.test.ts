import { describe, expect, it } from "vitest";
import type { Rule } from "@/domain/types";
import { matchRule, suggestPattern } from "./rules";

const rules: Rule[] = [
  { id: "r1", pattern: "UBER", categoryId: "transporte", hits: 10 },
  { id: "r2", pattern: "UBER EATS", categoryId: "alimentacao", hits: 2 },
  { id: "r3", pattern: "IFOOD", categoryId: "alimentacao", hits: 0 },
  { id: "r4", pattern: "PAGAMENTO DE FATURA", categoryId: "transfer", hits: 5 },
  { id: "r5", pattern: "MERCADO", categoryId: "mercado", hits: 1 },
  { id: "r6", pattern: "MERCADO", categoryId: "mercado-dup", hits: 3 },
];

describe("matchRule", () => {
  it("matches by contains on the normalized text", () => {
    expect(matchRule("COMPRA NO DEBITO IFOOD IFOOD", rules)?.id).toBe("r3");
  });

  it("prefers the longest pattern when several match", () => {
    expect(matchRule("UBER EATS PEDIDO", rules)?.id).toBe("r2");
    expect(matchRule("UBER TRIP", rules)?.id).toBe("r1");
  });

  it("breaks a length tie by hits", () => {
    expect(matchRule("SUPER MERCADO BOM", rules)?.id).toBe("r6");
  });

  it("returns null when nothing matches", () => {
    expect(matchRule("PADARIA SAO JOSE", rules)).toBeNull();
    expect(matchRule("", rules)).toBeNull();
  });
});

describe("suggestPattern", () => {
  it("takes what comes before the * (the processor) when the description has one", () => {
    expect(suggestPattern("Ifd*Kozuki Miyoshi Ca")).toBe("IFD");
    expect(suggestPattern("Tokio Marine*Auto03d12")).toBe("TOKIO MARINE");
    expect(suggestPattern("Zig*John O Groats Scot")).toBe("ZIG");
  });

  it("falls back to the whole normalized text without a *", () => {
    expect(suggestPattern("Comercio de Combustive")).toBe("COMERCIO DE COMBUSTIVE");
    expect(suggestPattern("Amazonprimebr")).toBe("AMAZONPRIMEBR");
  });

  it("falls back to the whole text when the part before * is too short to mean anything", () => {
    expect(suggestPattern("A*Loja Boa")).toBe("LOJA BOA");
    expect(suggestPattern("*Loja Boa")).toBe("LOJA BOA");
  });
});

describe("suggestPattern hygiene", () => {
  it("drops installment noise and single letters, keeping the merchant words", () => {
    expect(suggestPattern("Instituto Falqui Parcela 2/6")).toBe("INSTITUTO FALQUI");
    expect(suggestPattern("Oak I F I O Vault I Parcela")).toBe("OAK VAULT");
    expect(suggestPattern("Leroy Merlin Parcela 1/3")).toBe("LEROY MERLIN");
  });

  it("keeps the whole text when hygiene would leave nothing", () => {
    expect(suggestPattern("A B Parcela")).toBe("A B PARCELA");
  });
});
