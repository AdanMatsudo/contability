import { z } from "zod";

export const cnaeMappingInputSchema = z.object({
  // 2 to 4 leading digits of a CNAE code; the longest matching prefix wins.
  cnaePrefix: z.string().regex(/^\d{2,4}$/, "Use de 2 a 4 dígitos."),
  categoryId: z.string().min(1).max(64),
});

export type CnaeMappingInput = z.infer<typeof cnaeMappingInputSchema>;
