import { db } from "@/lib/db";
import type { Account, AccountType } from "@/domain/types";

export interface AccountInput {
  name: string;
  type: AccountType;
}

const select = { id: true, name: true, type: true } as const;

export const accountRepo = {
  async list(): Promise<Account[]> {
    return db.account.findMany({ orderBy: { name: "asc" }, select });
  },

  async create(input: AccountInput): Promise<Account> {
    return db.account.create({ data: input, select });
  },

  async update(id: string, input: Partial<AccountInput>): Promise<Account> {
    return db.account.update({ where: { id }, data: input, select });
  },

  async countTransactions(id: string): Promise<number> {
    return db.transaction.count({ where: { accountId: id } });
  },

  async remove(id: string): Promise<void> {
    await db.account.delete({ where: { id } });
  },
};
