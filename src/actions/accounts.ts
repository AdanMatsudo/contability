"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Account } from "@/domain/types";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { accountRepo } from "@/repositories/account.repo";
import { assertAccountRemovable, validateAccountName } from "@/services/accounts/account.service";
import { accountInputSchema } from "./schemas/account.schema";
import { idSchema } from "./schemas/category.schema";

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/");
}

function parseId(id: unknown): string {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new ValidationError({}, "Identificador inválido.");
  return parsed.data;
}

function parseInput(input: unknown) {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

export async function createAccount(input: unknown): Promise<ActionResult<Account>> {
  return runAction(async () => {
    await requireUser();
    const data = parseInput(input);
    const existing = await accountRepo.list();
    const name = validateAccountName(data.name, existing);
    if (!name.ok) throw new ValidationError({ name: [name.error] });
    const created = await accountRepo.create({ name: name.name, type: data.type });
    revalidate();
    return created;
  });
}

export async function updateAccount(id: unknown, input: unknown): Promise<ActionResult<Account>> {
  return runAction(async () => {
    await requireUser();
    const accountId = parseId(id);
    const data = parseInput(input);
    const existing = await accountRepo.list();
    if (!existing.some((a) => a.id === accountId)) throw new NotFoundError("Conta não encontrada.");
    const name = validateAccountName(data.name, existing, accountId);
    if (!name.ok) throw new ValidationError({ name: [name.error] });
    const updated = await accountRepo.update(accountId, { name: name.name, type: data.type });
    revalidate();
    return updated;
  });
}

export async function deleteAccount(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    await requireUser();
    const accountId = parseId(id);
    assertAccountRemovable(await accountRepo.countTransactions(accountId));
    await accountRepo.remove(accountId);
    revalidate();
    return null;
  });
}
