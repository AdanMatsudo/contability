import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data";
import { categoryRepo } from "@/repositories/category.repo";
import { cnaeRepo, cnpjCacheRepo } from "@/repositories/cnpj.repo";
import { db, truncateAll } from "./db";

describe("cnpjCacheRepo", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("saves and reads back entries, including negative ones", async () => {
    await cnpjCacheRepo.save([
      { cnpj: "12345678000190", found: true, razaoSocial: "EMPRESA XPTO LTDA", cnaeCode: "5611201", cnaeDescription: "Restaurantes" },
      { cnpj: "99999999000199", found: false, razaoSocial: null, cnaeCode: null, cnaeDescription: null },
    ]);

    const found = await cnpjCacheRepo.find(["12345678000190", "99999999000199", "11111111000111"]);
    expect(found).toHaveLength(2);
    expect(found.find((e) => e.cnpj === "12345678000190")).toEqual({
      cnpj: "12345678000190",
      found: true,
      razaoSocial: "EMPRESA XPTO LTDA",
      cnaeCode: "5611201",
      cnaeDescription: "Restaurantes",
    });
    expect(found.find((e) => e.cnpj === "99999999000199")?.found).toBe(false);
  });

  it("re-saving a CNPJ refreshes it instead of failing", async () => {
    const entry = { cnpj: "12345678000190", found: false, razaoSocial: null, cnaeCode: null, cnaeDescription: null };
    await cnpjCacheRepo.save([entry]);
    await cnpjCacheRepo.save([{ ...entry, found: true, razaoSocial: "AGORA EXISTE LTDA", cnaeCode: "4711302" }]);
    const [saved] = await cnpjCacheRepo.find(["12345678000190"]);
    expect(saved).toMatchObject({ found: true, razaoSocial: "AGORA EXISTE LTDA", cnaeCode: "4711302" });
  });

  it("asking for nothing hits neither the database nor an error", async () => {
    expect(await cnpjCacheRepo.find([])).toEqual([]);
    await expect(cnpjCacheRepo.save([])).resolves.toBeUndefined();
  });
});

describe("cnaeRepo", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("lists the seeded mappings and creates, updates and removes one", async () => {
    await seedDatabase(db);
    const categories = await categoryRepo.list();
    const saude = categories.find((c) => c.name === "Saúde")!;

    const seeded = await cnaeRepo.list();
    expect(seeded.length).toBeGreaterThan(10);
    expect(seeded.find((m) => m.cnaePrefix === "4711")).toBeDefined();

    const created = await cnaeRepo.create({ cnaePrefix: "8610", categoryId: saude.id });
    expect(created).toMatchObject({ cnaePrefix: "8610", categoryId: saude.id });

    const compras = categories.find((c) => c.name === "Compras")!;
    const updated = await cnaeRepo.update(created.id, { categoryId: compras.id });
    expect(updated.categoryId).toBe(compras.id);

    await cnaeRepo.remove(created.id);
    expect((await cnaeRepo.list()).some((m) => m.id === created.id)).toBe(false);
  });
});
