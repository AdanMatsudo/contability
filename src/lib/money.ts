const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number): string {
  return brlFormatter.format(cents / 100);
}

// Accepts "1.234,56", "R$ 1.234,56", "1234", "12,5", "-0,50", "− 12,00".
export function parseBrl(input: string): number | null {
  const cleaned = input
    .replace(/R\$/g, "")
    .replace(/−/g, "-")
    .replace(/[\s ]/g, "");
  const match = /^(-?)(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, sign, whole, decimals = ""] = match;
  const reais = Number(whole.replace(/\./g, ""));
  const cents = Number(decimals.padEnd(2, "0"));
  const value = reais * 100 + cents;
  return sign === "-" ? -value : value;
}

// Accepts bank-export decimals like "-123.45", "1234.5", "10".
export function parseDecimal(input: string): number | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) return null;
  const [, sign, whole, decimals = ""] = match;
  const twoDigits = decimals.slice(0, 2).padEnd(2, "0");
  let value = Number(whole) * 100 + Number(twoDigits);
  if (decimals.length > 2 && Number(decimals[2]) >= 5) value += 1;
  return sign === "-" ? -value : value;
}
