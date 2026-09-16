import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { daysAgoIso } from "@/lib/dates";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { cnaeRepo } from "@/repositories/cnpj.repo";
import { parseCategoryFilter, type CategoryWithUsage } from "@/services/categories/category-filter";
import { AccountsManager } from "@/components/categories/AccountsManager";
import { CategoriesManager } from "@/components/categories/CategoriesManager";
import { CnaeManager } from "@/components/categories/CnaeManager";

const USAGE_DAYS = 90;

const TITLE = { categories: "Categorias", accounts: "Contas", cnae: "Mapeamento CNAE" } as const;

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string; kind?: string; sort?: string }>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  await requireUser();
  const params = await searchParams;
  const tab = params.tab === "accounts" || params.tab === "cnae" ? params.tab : "categories";
  const since = daysAgoIso(USAGE_DAYS);
  const [categories, accounts, usage, cnaeMappings] = await Promise.all([
    categoryRepo.list(),
    accountRepo.list(),
    categoryRepo.usageCounts(since),
    cnaeRepo.list(),
  ]);
  const withUsage: CategoryWithUsage[] = categories.map((c) => ({ ...c, usageCount: usage[c.id] ?? 0 }));

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">{TITLE[tab]}</h1>
        <div className="flex gap-1 p-1 rounded-full bg-surface border border-border">
          <Tab href="/categories" active={tab === "categories"}>
            Categorias
          </Tab>
          <Tab href="/categories?tab=accounts" active={tab === "accounts"}>
            Contas
          </Tab>
          <Tab href="/categories?tab=cnae" active={tab === "cnae"}>
            CNAE
          </Tab>
        </div>
      </div>
      {tab === "accounts" && <AccountsManager accounts={accounts} />}
      {tab === "cnae" && <CnaeManager mappings={cnaeMappings} categories={categories} />}
      {tab === "categories" && (
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
