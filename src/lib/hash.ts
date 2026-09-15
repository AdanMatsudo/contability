import { createHash } from "node:crypto";
import type { IsoDate } from "./dates";

export interface ImportHashInput {
  accountId: string;
  date: IsoDate;
  amountCents: number;
  normalized: string;
  // Index among rows of the same file sharing date, amount and normalized text,
  // so two identical purchases on one day are not treated as one.
  ordinal: number;
}

const SEPARATOR = "";

export function computeImportHash(input: ImportHashInput): string {
  const payload = [
    input.accountId,
    input.date,
    String(input.amountCents),
    input.normalized,
    String(input.ordinal),
  ].join(SEPARATOR);
  return createHash("sha1").update(payload, "utf8").digest("hex");
}
