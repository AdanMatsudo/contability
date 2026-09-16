"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CnaeMapping } from "@/domain/types";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { categoryRepo } from "@/repositories/category.repo";
import { cnaeRepo } from "@/repositories/cnpj.repo";
import { idSchema } from "./schemas/category.schema";
import { cnaeMappingInputSchema } from "./schemas/cnae.schema";

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/import");
}

function parseInput(input: unknown) {
  const parsed = cnaeMappingInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

async function assertCategory(categoryId: string) {
  const categories = await categoryRepo.list();
  if (!categories.some((c) => c.id === categoryId)) throw new ValidationError({ categoryId: ["Escolha uma categoria."] });
}

export async function createCnaeMapping(input: unknown): Promise<ActionResult<CnaeMapping>> {
  return runAction(async () => {
    await requireUser();
    const data = parseInput(input);
    await assertCategory(data.categoryId);
    const existing = await cnaeRepo.list();
    if (existing.some((m) => m.cnaePrefix === data.cnaePrefix)) {
      throw new ConflictError(`Já existe um mapeamento para o prefixo ${data.cnaePrefix}.`);
    }
    const created = await cnaeRepo.create(data);
    revalidate();
    return created;
  });
}

export async function updateCnaeMapping(id: unknown, input: unknown): Promise<ActionResult<CnaeMapping>> {
  return runAction(async () => {
    await requireUser();
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new ValidationError({}, "Identificador inválido.");
    const data = parseInput(input);
    await assertCategory(data.categoryId);
    const existing = await cnaeRepo.list();
    if (!existing.some((m) => m.id === parsedId.data)) throw new NotFoundError("Mapeamento não encontrado.");
    if (existing.some((m) => m.id !== parsedId.data && m.cnaePrefix === data.cnaePrefix)) {
      throw new ConflictError(`Já existe um mapeamento para o prefixo ${data.cnaePrefix}.`);
    }
    const updated = await cnaeRepo.update(parsedId.data, data);
    revalidate();
    return updated;
  });
}

export async function deleteCnaeMapping(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    await requireUser();
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new ValidationError({}, "Identificador inválido.");
    await cnaeRepo.remove(parsedId.data);
    revalidate();
    return null;
  });
}
