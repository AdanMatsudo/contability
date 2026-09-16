"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Transaction } from "@/domain/types";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { transactionRepo } from "@/repositories/transaction.repo";
import { accountsForFlow } from "@/services/accounts/account.service";
import { buildFromManual, type ManualFlow } from "@/services/transactions/transaction.service";
import { idSchema } from "./schemas/category.schema";
import { manualTransactionSchema } from "./schemas/transaction.schema";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/categories");
}

function parseId(id: unknown): string {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new ValidationError({}, "Identificador inválido.");
  return parsed.data;
}

function parseInput(input: unknown) {
  const parsed = manualTransactionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

// The account must exist, accept this flow, and the category, when given, must
// exist too: the form sends ids, and a stale page can send one that was just deleted.
async function assertReferences(accountId: string, categoryId: string | null, flow: ManualFlow) {
  const [accounts, categories] = await Promise.all([accountRepo.list(), categoryRepo.list()]);
  const fieldErrors: Record<string, string[]> = {};
  const account = accounts.find((a) => a.id === accountId);
  if (!account) fieldErrors.accountId = ["Escolha uma conta."];
  else if (!accountsForFlow([account], flow).length) fieldErrors.accountId = ["Entrada não cai em cartão de crédito."];
  if (categoryId && !categories.some((c) => c.id === categoryId)) fieldErrors.categoryId = ["Essa categoria não existe mais."];
  if (Object.keys(fieldErrors).length > 0) throw new ValidationError(fieldErrors);
}

export async function createTransaction(input: unknown): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireUser();
    const data = parseInput(input);
    const draft = buildFromManual(data);
    await assertReferences(draft.accountId, draft.categoryId, data.kind);
    const created = await transactionRepo.create(draft);
    revalidate();
    return created;
  });
}

export async function updateTransaction(id: unknown, input: unknown): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    await requireUser();
    const transactionId = parseId(id);
    const data = parseInput(input);
    const existing = await transactionRepo.findById(transactionId);
    if (!existing) throw new NotFoundError("Lançamento não encontrado.");
    const draft = buildFromManual(data);
    await assertReferences(draft.accountId, draft.categoryId, data.kind);
    // Editing keeps the original source; only the fields the form owns change.
    const updated = await transactionRepo.update(transactionId, {
      date: draft.date,
      amountCents: draft.amountCents,
      description: draft.description,
      normalized: draft.normalized,
      accountId: draft.accountId,
      categoryId: draft.categoryId,
      categorizedBy: draft.categoryId ? "MANUAL" : null,
    });
    revalidate();
    return updated;
  });
}

export async function deleteTransaction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    await requireUser();
    const transactionId = parseId(id);
    const existing = await transactionRepo.findById(transactionId);
    if (!existing) throw new NotFoundError("Lançamento não encontrado.");
    await transactionRepo.remove(transactionId);
    revalidate();
    return null;
  });
}
