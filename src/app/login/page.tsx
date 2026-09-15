import { signIn } from "@/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const denied = error === "AccessDenied";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3f3f1] text-[#111110]">
      <div className="w-[360px] flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#111110]" />
          <span className="text-xl font-semibold tracking-tight">finance</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#111110] text-white font-medium text-sm"
          >
            Entrar com Google
          </button>
        </form>
        {denied && (
          <p className="text-sm text-[#a14d13] bg-[#fff4e8] rounded-xl px-4 py-3 text-center">
            Acesso negado. Esta conta não está autorizada.
          </p>
        )}
      </div>
    </main>
  );
}
