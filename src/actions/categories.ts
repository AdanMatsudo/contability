"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Category } from "@/domain/types";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { categoryRepo } from "@/repositories/category.repo";
import { parseBudget, pickColor, validateCategoryName } from "@/services/categories/category.service";
import { categoryInputSchema, idSchema } from "./schemas/category.schema";

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function createCategory(input: unknown): Promise<ActionResult<Category>> {
  await requireUser();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.", z.flattenError(parsed.error).fieldErrors);

  const existing = await categoryRepo.list();
  const name = validateCategoryName(parsed.data.name, existing);
  if (!name.ok) return fail(undefined, { name: [name.error] });
  const budget = parseBudget(parsed.data.budget);
  if (!budget.ok) return fail(undefined, { budget: [budget.error] });

  const created = await categoryRepo.create({
    name: name.name,
    kind: parsed.data.kind,
    budgetCents: budget.budgetCents,
    color: parsed.data.color ?? pickColor(existing.map((c) => c.color)),
  });
  revalidate();
  return ok(created);
}

export async function updateCategory(id: unknown, input: unknown): Promise<ActionResult<Category>> {
  await requireUser();
  const parsedId = idSchema.safeParse(id);
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return fail("Dados inválidos.");

  const existing = await categoryRepo.list();
  if (!existing.some((c) => c.id === parsedId.data)) return fail("Categoria não encontrada.");
  const name = validateCategoryName(parsed.data.name, existing, parsedId.data);
  if (!name.ok) return fail(undefined, { name: [name.error] });
  const budget = parseBudget(parsed.data.budget);
  if (!budget.ok) return fail(undefined, { budget: [budget.error] });

  const updated = await categoryRepo.update(parsedId.data, {
    name: name.name,
    kind: parsed.data.kind,
    budgetCents: budget.budgetCents,
    ...(parsed.data.color ? { color: parsed.data.color } : {}),
  });
  revalidate();
  return ok(updated);
}

export async function deleteCategory(id: unknown): Promise<ActionResult<{ movedTransactions: number }>> {
  await requireUser();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Dados inválidos.");
  const movedTransactions = await categoryRepo.countTransactions(parsedId.data);
  await categoryRepo.remove(parsedId.data);
  revalidate();
  return ok({ movedTransactions });
}
