import { z } from "zod";

export const accountTypeSchema = z.enum(["CHECKING", "CREDIT_CARD", "CASH"]);

export const accountInputSchema = z.object({
  name: z.string().max(200),
  type: accountTypeSchema,
});

export type AccountInput = z.infer<typeof accountInputSchema>;
