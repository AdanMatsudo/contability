import { requireUser } from "@/lib/auth-guard";
import { currentMonth, todayIso } from "@/lib/dates";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { transactionRepo } from "@/repositories/transaction.repo";
import { parseTransactionFilter } from "@/services/transactions/transaction-filter";
import { TransactionsManager } from "@/components/transactions/TransactionsManager";
import { MonthNav } from "@/components/ui/MonthNav";

interface PageProps {
  searchParams: Promise<{ month?: string; flow?: string; category?: string; q?: string }>;
}

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function TransactionsPage({ searchParams }: PageProps) {
  await requireUser();
  const params = await searchParams;
  const current = currentMonth();
  const month = params.month && YEAR_MONTH.test(params.month) ? params.month : current;

  const [transactions, categories, accounts] = await Promise.all([
    transactionRepo.listByMonth(month),
    categoryRepo.list(),
    accountRepo.list(),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">Lançamentos</h1>
        <MonthNav month={month} current={current} basePath="/transactions" />
      </div>
      <TransactionsManager
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        month={month}
        today={todayIso()}
        initialFilter={parseTransactionFilter(params)}
      />
    </main>
  );
}
