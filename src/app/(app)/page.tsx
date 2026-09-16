import { requireUser } from "@/lib/auth-guard";
import { addMonths, currentMonth } from "@/lib/dates";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { transactionRepo } from "@/repositories/transaction.repo";
import { buildInsight } from "@/services/month/insight.service";
import { history6, summarize } from "@/services/month/month.service";
import { MonthDashboard } from "@/components/month/MonthDashboard";
import { MonthNav } from "@/components/ui/MonthNav";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MonthPage({ searchParams }: PageProps) {
  await requireUser();
  const { month: requested } = await searchParams;
  const current = currentMonth();
  const month = requested && YEAR_MONTH.test(requested) ? requested : current;
  const previous = addMonths(month, -1);

  const [transactions, previousTransactions, categories, accounts, totals] = await Promise.all([
    transactionRepo.listByMonth(month),
    transactionRepo.listByMonth(previous),
    categoryRepo.list(),
    accountRepo.list(),
    transactionRepo.sumByMonthRange(addMonths(month, -5), month),
  ]);

  const summary = summarize(transactions, categories, month);
  const previousSummary = summarize(previousTransactions, categories, previous);
  const insight = buildInsight(summary, previousSummary);
  const history = history6(totals, month);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">Mês</h1>
        <MonthNav month={month} current={current} basePath="/" />
      </div>
      <MonthDashboard
        summary={summary}
        history={history}
        insight={insight}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        isCurrentMonth={month === current}
      />
    </main>
  );
}
