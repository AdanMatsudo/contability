import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Transaction } from "@/domain/types";
import { monthRange, type IsoDate, type YearMonth } from "@/lib/dates";
import type { MonthTotals } from "@/services/month/month.service";
import type { NewTransaction } from "@/services/transactions/transaction.service";

const select = {
  id: true,
  date: true,
  amountCents: true,
  description: true,
  normalized: true,
  source: true,
  categorizedBy: true,
  accountId: true,
  categoryId: true,
  importBatchId: true,
  recurringId: true,
} as const;

type Row = Prisma.TransactionGetPayload<{ select: typeof select }>;

// DATE columns come back as UTC midnight; the ISO slice is the calendar day stored.
const toIso = (d: Date): IsoDate => d.toISOString().slice(0, 10);
const toDate = (iso: IsoDate): Date => new Date(`${iso}T00:00:00Z`);

function toDomain(row: Row): Transaction {
  return { ...row, date: toIso(row.date) };
}

export const transactionRepo = {
  async listByMonth(month: YearMonth): Promise<Transaction[]> {
    const { from, to } = monthRange(month);
    const rows = await db.transaction.findMany({
      where: { date: { gte: toDate(from), lte: toDate(to) } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select,
    });
    return rows.map(toDomain);
  },

  async findById(id: string): Promise<Transaction | null> {
    const row = await db.transaction.findUnique({ where: { id }, select });
    return row ? toDomain(row) : null;
  },

  async create(input: NewTransaction): Promise<Transaction> {
    const row = await db.transaction.create({ data: { ...input, date: toDate(input.date) }, select });
    return toDomain(row);
  },

  async update(id: string, input: Partial<NewTransaction>): Promise<Transaction> {
    const { date, ...rest } = input;
    const row = await db.transaction.update({
      where: { id },
      data: { ...rest, ...(date ? { date: toDate(date) } : {}) },
      select,
    });
    return toDomain(row);
  },

  async remove(id: string): Promise<void> {
    await db.transaction.delete({ where: { id } });
  },

  // Per-month totals for the history cards. Transfers move money between
  // accounts and are neither income nor expense.
  async sumByMonthRange(fromMonth: YearMonth, toMonth: YearMonth): Promise<MonthTotals[]> {
    const from = toDate(monthRange(fromMonth).from);
    const to = toDate(monthRange(toMonth).to);
    const rows = await db.$queryRaw<{ month: string; income: bigint | number; expense: bigint | number }[]>(Prisma.sql`
      SELECT to_char(t."date", 'YYYY-MM') AS month,
             COALESCE(SUM(CASE WHEN t."amountCents" >= 0 THEN t."amountCents" ELSE 0 END), 0) AS income,
             COALESCE(SUM(CASE WHEN t."amountCents" < 0 THEN -t."amountCents" ELSE 0 END), 0) AS expense
      FROM "Transaction" t
      LEFT JOIN "Category" c ON c."id" = t."categoryId"
      WHERE t."date" BETWEEN ${from} AND ${to}
        AND (c."kind" IS NULL OR c."kind" <> 'TRANSFER')
      GROUP BY 1
      ORDER BY 1
    `);
    return rows.map((r) => ({ month: r.month, incomeCents: Number(r.income), expenseCents: Number(r.expense) }));
  },
};
