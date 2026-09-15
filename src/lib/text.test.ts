import { describe, expect, it } from "vitest";
import { normalize, stripAccents } from "./text";

describe("stripAccents", () => {
  it("removes diacritics and keeps case", () => {
    expect(stripAccents("Pão de Açúcar")).toBe("Pao de Acucar");
    expect(stripAccents("ÀÉÎÕÜÇ")).toBe("AEIOUC");
  });
});

describe("normalize", () => {
  it("uppercases, strips accents and digits, collapses spaces", () => {
    expect(normalize("Pão de Açúcar 123")).toBe("PAO DE ACUCAR");
  });

  it("turns punctuation into spaces so merchant prefixes split", () => {
    expect(normalize("UBER *TRIP")).toBe("UBER TRIP");
    expect(normalize("PAG*Padaria São José")).toBe("PAG PADARIA SAO JOSE");
  });

  it("drops the digits of a CNPJ but keeps the words around it", () => {
    expect(normalize("Pix enviado - CONDOMINIO SOL LTDA - CNPJ 12.345.678/0001-90")).toBe(
      "PIX ENVIADO CONDOMINIO SOL LTDA CNPJ",
    );
  });

  it("returns an empty string when nothing is left", () => {
    expect(normalize("12345")).toBe("");
    expect(normalize("   ")).toBe("");
  });
});
