import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalServiceError } from "@/lib/errors";
import { fetchCnpj } from "./brasilapi";

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCnpj", () => {
  it("asks BrasilAPI for the bare digits and returns the fields we use", async () => {
    const fetchMock = respond(200, {
      cnpj: "12345678000190",
      razao_social: "EMPRESA XPTO LTDA",
      cnae_fiscal: 5611201,
      cnae_fiscal_descricao: "Restaurantes e similares",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCnpj("12.345.678/0001-90");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://brasilapi.com.br/api/cnpj/v1/12345678000190");
    expect(result).toEqual({
      cnpj: "12345678000190",
      razaoSocial: "EMPRESA XPTO LTDA",
      cnaeCode: "5611201",
      cnaeDescription: "Restaurantes e similares",
    });
  });

  it("returns null for a CNPJ the API does not know", async () => {
    vi.stubGlobal("fetch", respond(404, { message: "CNPJ não encontrado" }));
    expect(await fetchCnpj("12345678000190")).toBeNull();
  });

  it("returns null for a CNPJ the API rejects as invalid (400), which is an answer, not a failure", async () => {
    vi.stubGlobal("fetch", respond(400, { message: "CNPJ 99.999.999/0001-99 inválido.", type: "bad_request" }));
    expect(await fetchCnpj("99999999000199")).toBeNull();
  });

  it("identifies the app to the public API", async () => {
    const fetchMock = respond(200, { cnpj: "12345678000190" });
    vi.stubGlobal("fetch", fetchMock);
    await fetchCnpj("12345678000190");
    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("user-agent")).toContain("finance");
  });

  it("raises an ExternalServiceError on a server error", async () => {
    vi.stubGlobal("fetch", respond(500, {}));
    await expect(fetchCnpj("12345678000190")).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("raises an ExternalServiceError when the request fails or times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new DOMException("The operation was aborted", "TimeoutError");
      }),
    );
    await expect(fetchCnpj("12345678000190")).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("rejects a malformed CNPJ without calling the API", async () => {
    const fetchMock = respond(200, {});
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchCnpj("123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives a payload without CNAE fields", async () => {
    vi.stubGlobal("fetch", respond(200, { cnpj: "12345678000190", razao_social: "X" }));
    expect(await fetchCnpj("12345678000190")).toEqual({
      cnpj: "12345678000190",
      razaoSocial: "X",
      cnaeCode: null,
      cnaeDescription: null,
    });
  });
});
