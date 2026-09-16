"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fetchCnpj } from "@/adapters/brasilapi";
import { decodeStatement } from "@/adapters/parsers/csv";
import type { ImportBatch } from "@/domain/types";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth-guard";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { accountRepo } from "@/repositories/account.repo";
import { cnaeRepo, cnpjCacheRepo } from "@/repositories/cnpj.repo";
import { csvMappingRepo } from "@/repositories/csv-mapping.repo";
import { importRepo } from "@/repositories/import.repo";
import { ruleRepo } from "@/repositories/rule.repo";
import type { CnpjAnswer } from "@/services/categorization/cascade";
import { resolveCnpjs } from "@/services/categorization/cnpj";
import {
  confirmImport as confirmImportService,
  prepareImport as prepareImportService,
  type ImportResult,
  type PreparedImport,
} from "@/services/import/import.service";
import { idSchema } from "./schemas/category.schema";
import { columnMappingSchema, confirmImportSchema } from "./schemas/import.schema";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function revalidate() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/import");
}

async function assertAccount(accountId: string) {
  const accounts = await accountRepo.list();
  if (!accounts.some((a) => a.id === accountId)) throw new ValidationError({ accountId: ["Escolha uma conta."] });
}

// Step 1: file → rows to review. Nothing is written yet.
export async function prepareImport(formData: FormData): Promise<ActionResult<PreparedImport>> {
  return runAction(async () => {
    await requireUser();
    const file = formData.get("file");
    const accountId = idSchema.safeParse(formData.get("accountId"));
    if (!(file instanceof File) || file.size === 0) throw new ValidationError({ file: ["Escolha um arquivo CSV ou OFX."] });
    if (file.size > MAX_FILE_BYTES) throw new ValidationError({ file: ["Arquivo acima de 2 MB. Exporte um período menor."] });
    if (!accountId.success) throw new ValidationError({ accountId: ["Escolha uma conta."] });
    await assertAccount(accountId.data);

    const rawMapping = formData.get("mapping");
    let mapping;
    if (typeof rawMapping === "string" && rawMapping) {
      const parsed = columnMappingSchema.safeParse(JSON.parse(rawMapping));
      if (!parsed.success) throw new ValidationError({}, "Mapeamento de colunas inválido.");
      mapping = parsed.data;
    }

    const text = decodeStatement(new Uint8Array(await file.arrayBuffer()));
    const [rules, mappings] = await Promise.all([ruleRepo.list(), cnaeRepo.list()]);

    // Stage 2 of the cascade: CNPJ in the description → BrasilAPI → CNAE map.
    // Failures here surface as a warning on the review screen, never a dead end.
    const byCnpj = async (cnpjs: string[]): Promise<Map<string, CnpjAnswer>> => {
      const resolved = await resolveCnpjs(cnpjs, {
        mappings,
        cached: (list) => cnpjCacheRepo.find(list),
        fetchCnpj: (cnpj) => fetchCnpj(cnpj),
        save: (entries) => cnpjCacheRepo.save(entries),
      });
      const answers = new Map<string, CnpjAnswer>();
      for (const cnpj of cnpjs) {
        const categoryId = resolved.categories.get(cnpj) ?? null;
        const razaoSocial = resolved.names.get(cnpj) ?? null;
        if (categoryId || razaoSocial) answers.set(cnpj, { categoryId, razaoSocial });
      }
      return answers;
    };

    return prepareImportService(
      { text, fileName: file.name, accountId: accountId.data, mapping },
      {
        rules,
        existingHashes: (hashes) => importRepo.existingHashes(hashes),
        findMapping: (signature) => csvMappingRepo.find(signature),
        byCnpj,
      },
    );
  });
}

// Step 2: the reviewed rows plus the user's decisions → one transactional write.
export async function confirmImport(payload: unknown): Promise<ActionResult<ImportResult>> {
  return runAction(async () => {
    await requireUser();
    const parsed = confirmImportSchema.safeParse(payload);
    if (!parsed.success) throw new ValidationError(z.flattenError(parsed.error).fieldErrors, "Revisão inválida. Recarregue e tente de novo.");
    await assertAccount(parsed.data.accountId);
    const result = await confirmImportService(parsed.data, {
      rules: await ruleRepo.list(),
      commit: (input) => importRepo.commit(input),
    });
    revalidate();
    return result;
  });
}

export async function undoImport(batchId: unknown): Promise<ActionResult<{ removed: number }>> {
  return runAction(async () => {
    await requireUser();
    const id = idSchema.safeParse(batchId);
    if (!id.success) throw new ValidationError({}, "Identificador inválido.");
    const batch = await importRepo.findById(id.data);
    if (!batch) throw new NotFoundError("Essa importação já foi desfeita.");
    const removed = await importRepo.undo(id.data);
    revalidate();
    return { removed };
  });
}

export async function saveCsvMapping(signature: unknown, mapping: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    await requireUser();
    const sig = z.string().min(1).max(500).safeParse(signature);
    const parsed = columnMappingSchema.safeParse(mapping);
    if (!sig.success || !parsed.success) throw new ValidationError({}, "Mapeamento de colunas inválido.");
    await csvMappingRepo.save(sig.data, parsed.data);
    return null;
  });
}

export async function listRecentImports(): Promise<ActionResult<ImportBatch[]>> {
  return runAction(async () => {
    await requireUser();
    return importRepo.listRecent(10);
  });
}
