import type { StatementFormat } from "@/adapters/parsers/types";
import type { Account, AccountType } from "@/domain/types";

const WANTED: Partial<Record<StatementFormat, AccountType>> = {
  "nubank-card-csv": "CREDIT_CARD",
  "nubank-account-csv": "CHECKING",
  ofx: "CHECKING",
};

// A card export belongs on a card account. Returns the id to switch to, or null
// when the current account already fits or no account of that type exists.
export function suggestAccount(format: StatementFormat, accounts: Account[], currentId: string): string | null {
  const wanted = WANTED[format];
  if (!wanted) return null;
  const current = accounts.find((a) => a.id === currentId);
  if (current?.type === wanted) return null;
  return accounts.find((a) => a.type === wanted)?.id ?? null;
}
