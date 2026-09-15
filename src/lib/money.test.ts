import { describe, expect, it } from "vitest";
import { formatBRL, parseBrl, parseDecimal } from "./money";

const nbsp = " ";

describe("formatBRL", () => {
  it("formats positive cents with pt-BR separators", () => {
    expect(formatBRL(123456)).toBe(`R$${nbsp}1.234,56`);
  });

  it("formats zero", () => {
    expect(formatBRL(0)).toBe(`R$${nbsp}0,00`);
  });

  it("formats negative cents with a minus sign", () => {
    expect(formatBRL(-50)).toBe(`-R$${nbsp}0,50`);
  });

  it("keeps two decimals for whole reais", () => {
    expect(formatBRL(920000)).toBe(`R$${nbsp}9.200,00`);
  });
});

describe("parseBrl", () => {
  it("parses thousands and decimal comma", () => {
    expect(parseBrl("1.234,56")).toBe(123456);
  });

  it("accepts the currency prefix and spaces", () => {
    expect(parseBrl("R$ 1.234,56")).toBe(123456);
    expect(parseBrl(`R$${nbsp}12,00`)).toBe(1200);
  });

  it("accepts a bare integer", () => {
    expect(parseBrl("1234")).toBe(123400);
  });

  it("accepts a single decimal digit", () => {
    expect(parseBrl("12,5")).toBe(1250);
  });

  it("parses negatives with hyphen or minus sign", () => {
    expect(parseBrl("-0,50")).toBe(-50);
    expect(parseBrl("− 12,00")).toBe(-1200);
  });

  it("returns null for garbage", () => {
    expect(parseBrl("")).toBeNull();
    expect(parseBrl("abc")).toBeNull();
    expect(parseBrl("1,2,3")).toBeNull();
  });
});

describe("parseDecimal", () => {
  it("parses dot-decimal values as exported by banks", () => {
    expect(parseDecimal("-123.45")).toBe(-12345);
    expect(parseDecimal("1234.5")).toBe(123450);
    expect(parseDecimal("10")).toBe(1000);
  });

  it("does not accumulate float error", () => {
    expect(parseDecimal("0.29")).toBe(29);
    expect(parseDecimal("1.15")).toBe(115);
  });

  it("returns null for garbage", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("1.2.3")).toBeNull();
  });
});
