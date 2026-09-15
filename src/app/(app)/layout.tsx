import { requireUser } from "@/lib/auth-guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-screen bg-[#f3f3f1] text-[#111110]">{children}</div>;
}
