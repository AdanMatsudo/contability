import { requireUser } from "@/lib/auth-guard";

export default async function MonthPage() {
  const user = await requireUser();
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-[22px] font-semibold tracking-tight">Mês</h1>
      <p className="text-sm text-muted">Conectado como {user.email}. A página do mês chega na próxima fase.</p>
    </main>
  );
}
