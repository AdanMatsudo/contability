export { auth as proxy } from "@/auth";

// Everything is private except the login page, the auth callbacks and static files.
export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
