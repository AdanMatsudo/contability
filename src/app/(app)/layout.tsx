import { requireUser } from "@/lib/auth-guard";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-7">{children}</div>
    </div>
  );
}
