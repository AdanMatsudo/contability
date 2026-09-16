export interface AuthErrorMessage {
  code: string;
  message: string;
}

const CALLBACK_ERRORS = new Set(["Configuration", "CallbackRouteError", "OAuthCallbackError", "OAuthSignin"]);

// Auth.js reports failures as ?error=<code> on the login page. Turn the code
// into something the owner can act on instead of the library's raw 500 page.
export function authErrorMessage(code: string | undefined): AuthErrorMessage | null {
  if (!code) return null;
  if (code === "AccessDenied") {
    return { code: "UNAUTHORIZED", message: "Acesso negado. Esta conta não está autorizada." };
  }
  if (CALLBACK_ERRORS.has(code)) {
    return {
      code: "AUTH_CALLBACK",
      message: "Falha no login com o Google. Volte e tente de novo pelo botão.",
    };
  }
  return { code, message: "Não deu pra entrar. Tente de novo." };
}
