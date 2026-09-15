import { redirect } from "next/navigation";
import { auth, isAllowedEmail } from "@/auth";

export interface CurrentUser {
  email: string;
  name: string | null;
}

// The proxy is only an optimistic gate. Every Server Action and every page
// that touches data calls this so a direct POST cannot bypass the allow-list.
export async function requireUser(): Promise<CurrentUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAllowedEmail(email)) redirect("/login");
  return { email: email as string, name: session?.user?.name ?? null };
}
