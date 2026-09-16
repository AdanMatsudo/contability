import { describe, expect, it, vi } from "vitest";
import type { CnaeMapping, CnpjCacheEntry } from "@/domain/types";
import { ExternalServiceError } from "@/lib/errors";
import { mapCnae, resolveCnpjs, runWithConcurrency } from "./cnpj";

const mappings: CnaeMapping[] = [
  { id: "m1", cnaePrefix: "47", categoryId: "compras" },
  { id: "m2", cnaePrefix: "4711", categoryId: "mercado" },
  { id: "m3", cnaePrefix: "56", categoryId: "alimentacao" },
];

describe("mapCnae", () => {
  it("picks the longest matching prefix", () => {
    expect(mapCnae("4711302", mappings)).toBe("mercado");
    expect(mapCnae("4729699", mappings)).toBe("compras");
    expect(mapCnae("5611201", mappings)).toBe("alimentacao");
  });

  it("returns null with no match or no code", () => {
    expect(mapCnae("8610101", mappings)).toBeNull();
    expect(mapCnae(null, mappings)).toBeNull();
    expect(mapCnae("", mappings)).toBeNull();
  });
});

describe("runWithConcurrency", () => {
  it("keeps results in order and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const tasks = [10, 5, 1, 8, 2, 3].map((ms, i) => async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running -= 1;
      return i;
    });
    expect(await runWithConcurrency(tasks, 2)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("handles an empty list", async () => {
    expect(await runWithConcurrency([], 3)).toEqual([]);
  });
});

function cached(cnpj: string, found: boolean, cnaeCode: string | null): CnpjCacheEntry {
  return { cnpj, found, razaoSocial: found ? "CACHED LTDA" : null, cnaeCode, cnaeDescription: null };
}

describe("resolveCnpjs", () => {
  it("answers from the cache without touching the network", async () => {
    const fetchCnpj = vi.fn();
    const save = vi.fn();
    const result = await resolveCnpjs(["12345678000190"], {
      mappings,
      cached: async () => [cached("12345678000190", true, "4711302")],
      fetchCnpj,
      save,
    });
    expect(result.categories.get("12345678000190")).toBe("mercado");
    expect(result.names.get("12345678000190")).toBe("CACHED LTDA");
    expect(fetchCnpj).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("honours a negative cache entry instead of asking again", async () => {
    const fetchCnpj = vi.fn();
    await resolveCnpjs(["99999999000199"], {
      mappings,
      cached: async () => [cached("99999999000199", false, null)],
      fetchCnpj,
      save: vi.fn(),
    });
    expect(fetchCnpj).not.toHaveBeenCalled();
  });

  it("fetches what the cache misses, maps it and saves the answer", async () => {
    const save = vi.fn();
    const fetchCnpj = vi.fn(async (cnpj: string) => ({
      cnpj,
      razaoSocial: "PADARIA LTDA",
      cnaeCode: "5611203",
      cnaeDescription: "Lanchonetes",
    }));
    const result = await resolveCnpjs(["12345678000190", "22222222000122"], {
      mappings,
      cached: async () => [cached("12345678000190", true, "4711302")],
      fetchCnpj,
      save,
    });
    expect(fetchCnpj).toHaveBeenCalledOnce();
    expect(fetchCnpj).toHaveBeenCalledWith("22222222000122");
    expect(result.categories.get("22222222000122")).toBe("alimentacao");
    expect(save).toHaveBeenCalledWith([
      { cnpj: "22222222000122", found: true, razaoSocial: "PADARIA LTDA", cnaeCode: "5611203", cnaeDescription: "Lanchonetes" },
    ]);
  });

  it("caches a not-found answer so the next import skips it", async () => {
    const save = vi.fn();
    const result = await resolveCnpjs(["33333333000133"], {
      mappings,
      cached: async () => [],
      fetchCnpj: async () => null,
      save,
    });
    expect(result.categories.has("33333333000133")).toBe(false);
    expect(save).toHaveBeenCalledWith([
      { cnpj: "33333333000133", found: false, razaoSocial: null, cnaeCode: null, cnaeDescription: null },
    ]);
  });

  it("keeps the CNAE even when no mapping matches, so the screen can offer one", async () => {
    const result = await resolveCnpjs(["44444444000144"], {
      mappings,
      cached: async () => [],
      fetchCnpj: async (cnpj) => ({ cnpj, razaoSocial: "CLINICA X", cnaeCode: "8610101", cnaeDescription: "Hospitais" }),
      save: vi.fn(),
    });
    expect(result.categories.has("44444444000144")).toBe(false);
    expect(result.cnaes.get("44444444000144")).toEqual({ code: "8610101", description: "Hospitais" });
  });

  it("lets an adapter failure bubble up so the cascade turns it into one warning", async () => {
    await expect(
      resolveCnpjs(["55555555000155"], {
        mappings,
        cached: async () => [],
        fetchCnpj: async () => {
          throw new ExternalServiceError("BrasilAPI");
        },
        save: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("asks for each distinct CNPJ once and saves nothing when there is nothing new", async () => {
    const fetchCnpj = vi.fn(async (cnpj: string) => ({ cnpj, razaoSocial: "X", cnaeCode: "5611201", cnaeDescription: null }));
    const save = vi.fn();
    const result = await resolveCnpjs(["12345678000190", "12345678000190"], { mappings, cached: async () => [], fetchCnpj, save });
    expect(fetchCnpj).toHaveBeenCalledOnce();
    expect(result.categories.get("12345678000190")).toBe("alimentacao");
    expect(save).toHaveBeenCalledOnce();
  });
});
