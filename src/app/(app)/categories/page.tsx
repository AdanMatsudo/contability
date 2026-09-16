import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { daysAgoIso } from "@/lib/dates";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { parseCategoryFilter, type CategoryWithUsage } from "@/services/categories/category-filter";
import { AccountsManager } from "@/components/categories/AccountsManager";
import { CategoriesManager } from "@/components/categories/CategoriesManager";

const USAGE_DAYS = 90;

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string; kind?: string; sort?: string }>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  await requireUser();
  const params = await searchParams;
  const showAccounts = params.tab === "accounts";
  const since = daysAgoIso(USAGE_DAYS);
  const [categories, accounts, usage] = await Promise.all([
    categoryRepo.list(),
    accountRepo.list(),
    categoryRepo.usageCounts(since),
  ]);
  const withUsage: CategoryWithUsage[] = categories.map((c) => ({ ...c, usageCount: usage[c.id] ?? 0 }));

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">{showAccounts ? "Contas" : "Categorias"}</h1>
        <div className="flex gap-1 p-1 rounded-full bg-surface border border-border">
          <Tab href="/categories" active={!showAccounts}>
            Categorias
          </Tab>
          <Tab href="/categories?tab=accounts" active={showAccounts}>
            Contas
          </Tab>
        </div>
      </div>
      {showAccounts ? (
        <AccountsManager accounts={accounts} />
      ) : (
        <CategoriesManager
          categories={withUsage}
          initialFilter={parseCategoryFilter(params)}
          usageDays={USAGE_DAYS}
        />
      )}
    </main>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "h-8 px-3.5 rounded-full text-xs font-medium flex items-center " +
        (active ? "bg-foreground text-white" : "text-muted hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}
