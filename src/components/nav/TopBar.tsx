import { signOut } from "@/auth";
import { FloatingNav } from "./FloatingNav";

export function TopBar() {
  return (
    <header className="relative h-[72px] flex items-center justify-between px-8">
      <div className="flex items-center gap-2.5">
        <div className="w-[22px] h-[22px] rounded-[7px] bg-foreground" />
        <span className="text-base font-semibold tracking-tight">finance</span>
      </div>
      <FloatingNav />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="h-9 px-3.5 rounded-xl border border-border bg-surface text-[13px] font-medium text-muted hover:text-foreground"
        >
          Sair
        </button>
      </form>
    </header>
  );
}
