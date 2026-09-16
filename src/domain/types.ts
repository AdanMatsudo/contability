import type { IsoDate } from "@/lib/dates";

export type AccountType = "CHECKING" | "CREDIT_CARD" | "CASH";
export type CategoryKind = "EXPENSE" | "INCOME" | "TRANSFER";
export type TransactionSource = "MANUAL" | "IMPORT" | "RECEIPT";
export type CategorizedBy = "RULE" | "CNPJ" | "AI" | "MANUAL";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  budgetCents: number | null;
  color: string;
}

export interface Transaction {
  id: string;
  date: IsoDate;
  amountCents: number;
  description: string;
  normalized: string;
  source: TransactionSource;
  categorizedBy: CategorizedBy | null;
  accountId: string;
  categoryId: string | null;
  importBatchId: string | null;
  recurringId: string | null;
}

export interface Rule {
  id: string;
  pattern: string;
  categoryId: string;
  hits: number;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  // ISO timestamp; batches are events, not calendar days.
  createdAt: string;
  accountId: string;
  accountName: string;
}

export interface CnaeMapping {
  id: string;
  // 2 to 4 leading digits of a CNAE code; the longest matching prefix wins.
  cnaePrefix: string;
  categoryId: string;
}

export interface CnpjCacheEntry {
  cnpj: string;
  // false = asked and the API does not know it; avoids asking again.
  found: boolean;
  razaoSocial: string | null;
  cnaeCode: string | null;
  cnaeDescription: string | null;
}
