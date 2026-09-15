import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { AccountsManager } from "@/components/categories/AccountsManager";
import { CategoriesManager } from "@/components/categories/CategoriesManager";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  await requireUser();
  const { tab } = await searchParams;
  const showAccounts = tab === "accounts";
  const [categories, accounts] = await Promise.all([categoryRepo.list(), accountRepo.list()]);

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
      {showAccounts ? <AccountsManager accounts={accounts} /> : <CategoriesManager categories={categories} />}
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
