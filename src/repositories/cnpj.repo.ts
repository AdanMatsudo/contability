import { db } from "@/lib/db";
import type { CnaeMapping, CnpjCacheEntry } from "@/domain/types";

const cacheSelect = { cnpj: true, found: true, razaoSocial: true, cnaeCode: true, cnaeDescription: true } as const;

export const cnpjCacheRepo = {
  async find(cnpjs: string[]): Promise<CnpjCacheEntry[]> {
    if (cnpjs.length === 0) return [];
    return db.cnpjCache.findMany({ where: { cnpj: { in: cnpjs } }, select: cacheSelect });
  },

  // Re-asking an old CNPJ refreshes it, so a company that appeared since the
  // last import stops being remembered as missing.
  async save(entries: CnpjCacheEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await db.$transaction(
      entries.map((entry) =>
        db.cnpjCache.upsert({
          where: { cnpj: entry.cnpj },
          update: { ...entry, fetchedAt: new Date() },
          create: entry,
        }),
      ),
    );
  },
};

const mappingSelect = { id: true, cnaePrefix: true, categoryId: true } as const;

export interface CnaeMappingInput {
  cnaePrefix: string;
  categoryId: string;
}

export const cnaeRepo = {
  async list(): Promise<CnaeMapping[]> {
    return db.cnaeMapping.findMany({ orderBy: { cnaePrefix: "asc" }, select: mappingSelect });
  },

  async create(input: CnaeMappingInput): Promise<CnaeMapping> {
    return db.cnaeMapping.create({ data: input, select: mappingSelect });
  },

  async update(id: string, input: Partial<CnaeMappingInput>): Promise<CnaeMapping> {
    return db.cnaeMapping.update({ where: { id }, data: input, select: mappingSelect });
  },

  async remove(id: string): Promise<void> {
    await db.cnaeMapping.delete({ where: { id } });
  },
};
