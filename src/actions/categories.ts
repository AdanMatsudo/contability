"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Category } from "@/domain/types";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoryRepo } from "@/repositories/category.repo";
import { parseBudget, pickColor, validateCategoryName } from "@/services/categories/category.service";
import { categoryInputSchema, idSchema } from "./schemas/category.schema";

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
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

export async function createCategory(input: unknown): Promise<ActionResult<Category>> {
  return runAction(async () => {
    await requireUser();
    const data = parseInput(input);

    const existing = await categoryRepo.list();
    const name = validateCategoryName(data.name, existing);
    if (!name.ok) throw new ValidationError({ name: [name.error] });
    const budget = parseBudget(data.budget);
    if (!budget.ok) throw new ValidationError({ budget: [budget.error] });

    const created = await categoryRepo.create({
      name: name.name,
      kind: data.kind,
      budgetCents: budget.budgetCents,
      color: data.color ?? pickColor(existing.map((c) => c.color)),
    });
    revalidate();
    return created;
  });
}

export async function updateCategory(id: unknown, input: unknown): Promise<ActionResult<Category>> {
  return runAction(async () => {
    await requireUser();
    const categoryId = parseId(id);
    const data = parseInput(input);

    const existing = await categoryRepo.list();
    if (!existing.some((c) => c.id === categoryId)) throw new NotFoundError("Categoria não encontrada.");
    const name = validateCategoryName(data.name, existing, categoryId);
    if (!name.ok) throw new ValidationError({ name: [name.error] });
    const budget = parseBudget(data.budget);
    if (!budget.ok) throw new ValidationError({ budget: [budget.error] });

    const updated = await categoryRepo.update(categoryId, {
      name: name.name,
      kind: data.kind,
      budgetCents: budget.budgetCents,
      ...(data.color ? { color: data.color } : {}),
    });
    revalidate();
    return updated;
  });
}

export async function deleteCategory(id: unknown): Promise<ActionResult<{ movedTransactions: number }>> {
  return runAction(async () => {
    await requireUser();
    const categoryId = parseId(id);
    const movedTransactions = await categoryRepo.countTransactions(categoryId);
    await categoryRepo.remove(categoryId);
    revalidate();
    return { movedTransactions };
  });
}
