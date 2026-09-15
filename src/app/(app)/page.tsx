import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-guard";

export default async function MonthPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto w-[1080px] py-10 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mês</h1>
      <p className="text-sm text-[#6f6e6a]">Conectado como {user.email}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="h-9 px-4 rounded-xl border border-[#e6e5e1] bg-white text-sm">
          Sair
        </button>
      </form>
    </main>
  );
}
