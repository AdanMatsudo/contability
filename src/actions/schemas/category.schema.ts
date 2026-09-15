import { z } from "zod";

export const categoryKindSchema = z.enum(["EXPENSE", "INCOME", "TRANSFER"]);

export const categoryInputSchema = z.object({
  name: z.string().max(200),
  kind: categoryKindSchema,
  budget: z.string().max(40).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const idSchema = z.string().min(1).max(64);
