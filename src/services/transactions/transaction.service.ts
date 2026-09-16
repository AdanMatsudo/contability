import type { IsoDate } from "@/lib/dates";
import { isIsoDate } from "@/lib/dates";
import { ValidationError, type FieldErrors } from "@/lib/errors";
import { parseBrl } from "@/lib/money";
import { normalize } from "@/lib/text";
import type { CategorizedBy, TransactionSource } from "@/domain/types";

export const MAX_DESCRIPTION = 200;

export type ManualFlow = "EXPENSE" | "INCOME";

export interface ManualInput {
  kind: ManualFlow;
  amount: string;
  date: string;
  description: string;
  accountId: string;
  categoryId: string | null;
}

// What the repository needs to persist a transaction. Ids and batch links come later.
export interface NewTransaction {
  date: IsoDate;
  amountCents: number;
  description: string;
  normalized: string;
  source: TransactionSource;
  categorizedBy: CategorizedBy | null;
  accountId: string;
  categoryId: string | null;
}

// The kind decides the sign; whatever sign the user typed is discarded.
export function buildFromManual(input: ManualInput): NewTransaction {
  const fieldErrors: FieldErrors = {};

  const cents = parseBrl(input.amount.trim());
  const magnitude = cents === null ? null : Math.abs(cents);
  if (magnitude === null) fieldErrors.amount = ["Valor inválido. Use 32,40."];
  else if (magnitude === 0) fieldErrors.amount = ["O valor precisa ser maior que zero."];

  if (!isIsoDate(input.date)) fieldErrors.date = ["Data inválida."];

  const description = input.description.trim().replace(/\s+/g, " ");
  if (!description) fieldErrors.description = ["Descreva o lançamento."];
  else if (description.length > MAX_DESCRIPTION) fieldErrors.description = [`Descrição com até ${MAX_DESCRIPTION} caracteres.`];

  if (Object.keys(fieldErrors).length > 0) throw new ValidationError(fieldErrors);

  return {
    date: input.date,
    amountCents: input.kind === "EXPENSE" ? -(magnitude as number) : (magnitude as number),
    description,
    normalized: normalize(description),
    source: "MANUAL",
    categorizedBy: input.categoryId ? "MANUAL" : null,
    accountId: input.accountId,
    categoryId: input.categoryId,
  };
}
