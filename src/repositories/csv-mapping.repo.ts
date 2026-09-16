import { db } from "@/lib/db";
import type { ColumnMapping } from "@/adapters/parsers/generic-csv";

// Column mappings for unknown CSV layouts, keyed by the sorted header signature.
export const csvMappingRepo = {
  async find(signature: string): Promise<ColumnMapping | null> {
    const row = await db.csvMapping.findUnique({ where: { headerSignature: signature } });
    return row ? (row.mapping as unknown as ColumnMapping) : null;
  },

  async save(signature: string, mapping: ColumnMapping): Promise<void> {
    const data = { ...mapping };
    await db.csvMapping.upsert({
      where: { headerSignature: signature },
      update: { mapping: data },
      create: { headerSignature: signature, mapping: data },
    });
  },
};
