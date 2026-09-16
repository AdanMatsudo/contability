import { z } from "zod";

export const columnMappingSchema = z.object({
  date: z.string().min(1).max(200),
  amount: z.string().min(1).max(200),
  description: z.string().min(1).max(200),
  dateFormat: z.enum(["dmy", "ymd"]),
  invertSign: z.boolean(),
});

const categorizedBySchema = z.enum(["RULE", "CNPJ", "AI", "MANUAL"]).nullable();

// The review state travels back from the client; every row is re-validated here
// before anything is written.
export const reviewRowSchema = z.object({
  index: z.number().int().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int(),
  description: z.string().max(500),
  externalId: z.string().max(200).nullable(),
  normalized: z.string().max(500),
  cnpj: z.string().max(14).nullable(),
  ordinal: z.number().int().min(0),
  importHash: z.string().regex(/^[0-9a-f]{40}$/),
  duplicate: z.boolean(),
  included: z.boolean(),
  categoryId: z.string().max(64).nullable(),
  categorizedBy: categorizedBySchema,
  ruleId: z.string().max(64).optional(),
  razaoSocial: z.string().max(200).optional(),
});

export const decisionSchema = z.object({
  index: z.number().int().min(0),
  included: z.boolean(),
  categoryId: z.string().max(64).nullable(),
  pattern: z.string().max(200).optional(),
  learn: z.boolean().optional(),
});

export const confirmImportSchema = z.object({
  accountId: z.string().min(1).max(64),
  fileName: z.string().min(1).max(200),
  rows: z.array(reviewRowSchema).max(5000),
  decisions: z.array(decisionSchema).max(5000),
});

export type ConfirmImportPayload = z.infer<typeof confirmImportSchema>;
