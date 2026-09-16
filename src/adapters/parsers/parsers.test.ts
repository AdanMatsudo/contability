import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeStatement, parseCsvTable } from "./csv";
import { detectFormat } from "./detect";
import { headerSignature, parseGenericCsv } from "./generic-csv";
import { parseNubankAccountCsv } from "./nubank-account-csv";
import { parseNubankCardCsv } from "./nubank-card-csv";
import { parseOfx } from "./ofx";

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`);
const text = (name: string) => decodeStatement(new Uint8Array(fixture(name)));

describe("decodeStatement", () => {
  it("reads UTF-8 and drops the BOM", () => {
    const t = text("nubank-conta.csv");
    expect(t.startsWith("Data,")).toBe(true);
    expect(t).toContain("Descrição");
  });

  it("falls back to windows-1252 when the bytes are not valid UTF-8", () => {
    expect(text("latin1.csv")).toContain("AÇAÍ DO ZÉ");
  });
});

describe("parseCsvTable", () => {
  it("detects the delimiter and returns headers plus rows", () => {
    const table = parseCsvTable(text("unknown.csv"));
    expect(table.headers).toEqual(["Quando", "Quanto", "Onde"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toEqual(["03/09/2026", "-10,50", "CAFE CENTRAL"]);
  });
});

describe("parseNubankAccountCsv", () => {
  const rows = parseNubankAccountCsv(text("nubank-conta.csv"));

  it("returns every line with ISO dates, signed cents and the identifier", () => {
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({
      date: "2026-09-01",
      amountCents: -3240,
      description: "Compra no débito - PADARIA SAO JOSE",
      externalId: "6f1a2b3c-0001",
    });
    expect(rows[4]).toEqual({
      date: "2026-09-10",
      amountCents: -8990,
      description: "Compra no débito - UBER *TRIP",
      externalId: "6f1a2b3c-0005",
    });
  });

  it("keeps income positive", () => {
    expect(rows[1].amountCents).toBe(500000);
  });

  it("accepts a comma decimal too, in case the account export follows the card one", () => {
    const rows = parseNubankAccountCsv('Data,Valor,Identificador,Descrição\n01/09/2026,"-32,40",id1,PADARIA\n');
    expect(rows[0]?.amountCents).toBe(-3240);
  });

  it("reads the windows-1252 variant the same way", () => {
    expect(parseNubankAccountCsv(text("latin1.csv"))[0].description).toBe("Compra no débito - AÇAÍ DO ZÉ");
  });
});

describe("parseNubankCardCsv", () => {
  const rows = parseNubankCardCsv(text("nubank-cartao.csv"));

  it("inverts the sign: a purchase is money out", () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ date: "2026-09-02", amountCents: -5490, description: "Ifood *Ifood", externalId: null });
    expect(rows[2].amountCents).toBe(-5590);
  });

  it("turns a received payment into money in, sign written with a space as the real export does", () => {
    expect(rows[1]).toMatchObject({ date: "2026-09-03", amountCents: 250000, description: "Pagamento recebido" });
  });
});

describe("parseOfx", () => {
  it("reads SGML without closing tags, taking the first 8 digits of DTPOSTED", () => {
    const rows = parseOfx(text("sample.ofx"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: "2026-09-03",
      amountCents: -4500,
      description: "DROGARIA SAO PAULO",
      externalId: "2026090300001",
    });
    expect(rows[1]).toEqual({
      date: "2026-09-05",
      amountCents: 120050,
      description: "RENDIMENTO POUPANCA",
      externalId: "2026090500002",
    });
  });

  it("reads the XML flavour identically, using NAME when MEMO is absent", () => {
    expect(parseOfx(text("sample-xml.ofx"))).toEqual(parseOfx(text("sample.ofx")));
  });
});

describe("generic csv", () => {
  const mapping = { date: "Quando", amount: "Quanto", description: "Onde", dateFormat: "dmy" as const, invertSign: false };

  it("maps columns by header name and accepts BRL decimals", () => {
    const rows = parseGenericCsv(text("unknown.csv"), mapping);
    expect(rows).toEqual([
      { date: "2026-09-03", amountCents: -1050, description: "CAFE CENTRAL", externalId: null },
      { date: "2026-09-04", amountCents: -2000, description: "LIVRARIA CULTURA", externalId: null },
    ]);
  });

  it("can invert the sign for card-style exports", () => {
    const rows = parseGenericCsv(text("unknown.csv"), { ...mapping, invertSign: true });
    expect(rows[0].amountCents).toBe(1050);
  });

  it("skips rows whose date or amount cannot be read", () => {
    const rows = parseGenericCsv("Quando;Quanto;Onde\nxx;1,00;A\n03/09/2026;abc;B\n03/09/2026;1,00;C\n", mapping);
    expect(rows.map((r) => r.description)).toEqual(["C"]);
  });

  it("builds a stable signature from the headers, ignoring case, accents and order of spaces", () => {
    expect(headerSignature(["Quando", " Quanto", "Onde"])).toBe("onde|quando|quanto");
    expect(headerSignature(["Descrição", "Data"])).toBe("data|descricao");
  });
});

describe("detectFormat", () => {
  it.each([
    ["nubank-conta.csv", "nubank-account-csv"],
    ["latin1.csv", "nubank-account-csv"],
    ["nubank-cartao.csv", "nubank-card-csv"],
    ["sample.ofx", "ofx"],
    ["sample-xml.ofx", "ofx"],
    ["unknown.csv", "generic-csv"],
  ])("%s → %s", (file, expected) => {
    expect(detectFormat(text(file))).toBe(expected);
  });

  it("calls a single-column or empty text unknown", () => {
    expect(detectFormat("")).toBe("unknown");
    expect(detectFormat("just some words\nno delimiter here\n")).toBe("unknown");
  });
});
