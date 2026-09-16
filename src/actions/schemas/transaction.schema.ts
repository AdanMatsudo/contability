import { z } from "zod";

export const manualTransactionSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  amount: z.string().max(40),
  date: z.string().max(10),
  description: z.string().max(500),
  accountId: z.string().min(1).max(64),
  categoryId: z.string().min(1).max(64).nullable(),
});

export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;
