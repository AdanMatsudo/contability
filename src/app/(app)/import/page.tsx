import { requireUser } from "@/lib/auth-guard";
import { accountRepo } from "@/repositories/account.repo";
import { categoryRepo } from "@/repositories/category.repo";
import { importRepo } from "@/repositories/import.repo";
import { ImportWizard } from "@/components/import/ImportWizard";
import { RecentImports } from "@/components/import/RecentImports";

export default async function ImportPage() {
  await requireUser();
  const [accounts, categories, recent] = await Promise.all([
    accountRepo.list(),
    categoryRepo.list(),
    importRepo.listRecent(10),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-[22px] font-semibold tracking-tight">Importar</h1>
      <ImportWizard accounts={accounts} categories={categories} />
      <RecentImports batches={recent} />
    </main>
  );
}
