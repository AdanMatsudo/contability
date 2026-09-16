import { ConflictError } from "@/lib/errors";
import { normalize } from "@/lib/text";

export const MAX_ACCOUNT_NAME = 40;

export type AccountNameValidation = { ok: true; name: string } | { ok: false; error: string };

export function validateAccountName(
  input: string,
  existing: { id: string; name: string }[],
  selfId?: string,
): AccountNameValidation {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Dê um nome à conta." };
  if (name.length > MAX_ACCOUNT_NAME) return { ok: false, error: `Nome com até ${MAX_ACCOUNT_NAME} caracteres.` };
  const key = normalize(name);
  const clash = existing.find((a) => a.id !== selfId && normalize(a.name) === key);
  if (clash) return { ok: false, error: `Já existe a conta "${clash.name}".` };
  return { ok: true, name };
}

// An account with transactions cannot be removed: the money has to live somewhere.
export function assertAccountRemovable(transactionCount: number): void {
  if (transactionCount > 0) {
    throw new ConflictError(`Esta conta tem ${transactionCount} lançamentos. Mova ou apague antes.`);
  }
}
