import type { PrismaClient } from "../src/generated/prisma/client";

type Kind = "EXPENSE" | "INCOME" | "TRANSFER";

const ACCOUNTS: { name: string; type: "CHECKING" | "CREDIT_CARD" | "CASH" }[] = [
  { name: "Nubank · conta", type: "CHECKING" },
  { name: "Nubank · cartão", type: "CREDIT_CARD" },
  { name: "Dinheiro", type: "CASH" },
];

const CATEGORIES: { name: string; kind: Kind; color: string }[] = [
  { name: "Casa", kind: "EXPENSE", color: "#2a78d6" },
  { name: "Mercado", kind: "EXPENSE", color: "#4a3aa7" },
  { name: "Transporte", kind: "EXPENSE", color: "#eda100" },
  { name: "Alimentação fora", kind: "EXPENSE", color: "#e87ba4" },
  { name: "Saúde", kind: "EXPENSE", color: "#e34948" },
  { name: "Lazer", kind: "EXPENSE", color: "#eb6834" },
  { name: "Assinaturas", kind: "EXPENSE", color: "#008300" },
  { name: "Compras", kind: "EXPENSE", color: "#6f6e6a" },
  { name: "Educação", kind: "EXPENSE", color: "#9a998f" },
  { name: "Viagem", kind: "EXPENSE", color: "#1baf7a" },
  { name: "Outros", kind: "EXPENSE", color: "#c9c8c2" },
  { name: "Salário", kind: "INCOME", color: "#1baf7a" },
  { name: "Rendimentos", kind: "INCOME", color: "#008300" },
  { name: "Outras receitas", kind: "INCOME", color: "#2a78d6" },
  { name: "Transferência", kind: "TRANSFER", color: "#c9c8c2" },
];

// Learned-rule starters: pattern is matched with "contains" on Transaction.normalized.
const RULES: { pattern: string; category: string }[] = [
  { pattern: "IFOOD", category: "Alimentação fora" },
  { pattern: "UBER", category: "Transporte" },
  { pattern: "PAGAMENTO DE FATURA", category: "Transferência" },
  { pattern: "PAGAMENTO RECEBIDO", category: "Transferência" },
  { pattern: "RENDIMENTO", category: "Rendimentos" },
];

// CNAE prefixes (2 to 4 digits); the longest matching prefix wins.
const CNAE_MAPPINGS: { prefix: string; category: string }[] = [
  { prefix: "56", category: "Alimentação fora" },
  { prefix: "4711", category: "Mercado" },
  { prefix: "4712", category: "Mercado" },
  { prefix: "4731", category: "Transporte" },
  { prefix: "49", category: "Transporte" },
  { prefix: "4771", category: "Saúde" },
  { prefix: "86", category: "Saúde" },
  { prefix: "85", category: "Educação" },
  { prefix: "61", category: "Casa" },
  { prefix: "35", category: "Casa" },
  { prefix: "36", category: "Casa" },
  { prefix: "68", category: "Casa" },
  { prefix: "55", category: "Viagem" },
  { prefix: "59", category: "Lazer" },
  { prefix: "90", category: "Lazer" },
  { prefix: "93", category: "Lazer" },
  { prefix: "47", category: "Compras" },
];

export interface SeedSummary {
  accounts: number;
  categories: number;
  rules: number;
  cnaeMappings: number;
}

// Idempotent: upserts by the natural keys (names, patterns, prefixes).
// Never overwrites a budget or color the user changed after the first run.
export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  for (const account of ACCOUNTS) {
    await prisma.account.upsert({
      where: { name: account.name },
      update: {},
      create: account,
    });
  }

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
      select: { id: true, name: true },
    });
    categoryIds.set(row.name, row.id);
  }

  const idOf = (name: string): string => {
    const id = categoryIds.get(name);
    if (!id) throw new Error(`seed: unknown category "${name}"`);
    return id;
  };

  for (const rule of RULES) {
    await prisma.rule.upsert({
      where: { pattern: rule.pattern },
      update: {},
      create: { pattern: rule.pattern, categoryId: idOf(rule.category) },
    });
  }

  for (const mapping of CNAE_MAPPINGS) {
    await prisma.cnaeMapping.upsert({
      where: { cnaePrefix: mapping.prefix },
      update: {},
      create: { cnaePrefix: mapping.prefix, categoryId: idOf(mapping.category) },
    });
  }

  return {
    accounts: await prisma.account.count(),
    categories: await prisma.category.count(),
    rules: await prisma.rule.count(),
    cnaeMappings: await prisma.cnaeMapping.count(),
  };
}
