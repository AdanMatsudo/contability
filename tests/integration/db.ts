import { db } from "@/lib/db";

// Order matters only for readability; TRUNCATE ... CASCADE handles the FKs.
const TABLES = [
  "Receipt",
  "Transaction",
  "ImportBatch",
  "Rule",
  "CnaeMapping",
  "Recurring",
  "AiCategorization",
  "CsvMapping",
  "CnpjCache",
  "Category",
  "Account",
];

export async function truncateAll(): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

export { db };
