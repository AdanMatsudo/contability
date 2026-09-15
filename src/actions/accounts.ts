"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Account } from "@/domain/types";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { accountRepo } from "@/repositories/account.repo";
import { validateAccountName } from "@/services/accounts/account.service";
import { accountInputSchema } from "./schemas/account.schema";
import { idSchema } from "./schemas/category.schema";

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function createAccount(input: unknown): Promise<ActionResult<Account>> {
  await requireUser();
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", z.flattenError(parsed.error).fieldErrors);
  const existing = await accountRepo.list();
  const name = validateAccountName(parsed.data.name, existing);
  if (!name.ok) return fail(undefined, { name: [name.error] });
  const created = await accountRepo.create({ name: name.name, type: parsed.data.type });
  revalidate();
  return ok(created);
}

export async function updateAccount(id: unknown, input: unknown): Promise<ActionResult<Account>> {
  await requireUser();
  const parsedId = idSchema.safeParse(id);
  const parsed = accountInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return fail("Dados inválidos.");
  const existing = await accountRepo.list();
  if (!existing.some((a) => a.id === parsedId.data)) return fail("Conta não encontrada.");
  const name = validateAccountName(parsed.data.name, existing, parsedId.data);
  if (!name.ok) return fail(undefined, { name: [name.error] });
  const updated = await accountRepo.update(parsedId.data, { name: name.name, type: parsed.data.type });
  revalidate();
  return ok(updated);
}

// An account with transactions cannot be removed: the money has to live somewhere.
export async function deleteAccount(id: unknown): Promise<ActionResult<null>> {
  await requireUser();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Dados inválidos.");
  const count = await accountRepo.countTransactions(parsedId.data);
  if (count > 0) return fail(`Esta conta tem ${count} lançamentos. Mova ou apague antes.`);
  await accountRepo.remove(parsedId.data);
  revalidate();
  return ok(null);
}
