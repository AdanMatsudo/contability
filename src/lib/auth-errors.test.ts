import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("returns nothing when there is no error", () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage("")).toBeNull();
  });

  it("explains a denied account", () => {
    expect(authErrorMessage("AccessDenied")).toEqual({
      code: "UNAUTHORIZED",
      message: "Acesso negado. Esta conta não está autorizada.",
    });
  });

  it("explains a broken Google callback and points back to the button", () => {
    for (const code of ["Configuration", "CallbackRouteError", "OAuthCallbackError"]) {
      const m = authErrorMessage(code);
      expect(m?.code).toBe("AUTH_CALLBACK");
      expect(m?.message).toContain("Google");
    }
  });

  it("falls back to a generic message that still shows the raw code", () => {
    const m = authErrorMessage("SomethingNew");
    expect(m?.code).toBe("SomethingNew");
    expect(m?.message).toBe("Não deu pra entrar. Tente de novo.");
  });
});
