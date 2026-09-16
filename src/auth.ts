import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Single-user app: only the allow-listed e-mail may sign in.
// No adapter on purpose: the session lives in a JWT cookie, no auth tables.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    authorized({ auth }) {
      return isAllowedEmail(auth?.user?.email);
    },
  },
});

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowed = process.env.ALLOWED_EMAIL;
  if (!email || !allowed) return false;
  return email.trim().toLowerCase() === allowed.trim().toLowerCase();
}
