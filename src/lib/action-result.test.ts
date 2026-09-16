import { describe, expect, it, vi } from "vitest";
import { fail, ok, runAction } from "./action-result";
import { ConflictError, ValidationError } from "./errors";

describe("ok / fail", () => {
  it("ok wraps data", () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  it("fail requires a code and a message", () => {
    expect(fail("NOT_FOUND", "Categoria não encontrada.")).toEqual({
      ok: false,
      code: "NOT_FOUND",
      error: "Categoria não encontrada.",
      fieldErrors: undefined,
    });
  });
});

describe("runAction", () => {
  it("returns ok with the callback result", async () => {
    const result = await runAction(async () => 42);
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("turns a thrown AppError into a coded failure without logging", async () => {
    const log = vi.fn();
    const result = await runAction(async () => {
      throw new ConflictError('Já existe a conta "Nubank".');
    }, log);
    expect(result).toEqual({
      ok: false,
      code: "CONFLICT",
      error: 'Já existe a conta "Nubank".',
      fieldErrors: undefined,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("carries field errors from a ValidationError", async () => {
    const result = await runAction(async () => {
      throw new ValidationError({ budget: ["Valor inválido. Use 1.200,00."] });
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION");
      expect(result.fieldErrors).toEqual({ budget: ["Valor inválido. Use 1.200,00."] });
    }
  });

  it("turns an unknown error into UNEXPECTED, logs the cause and hides it from the result", async () => {
    const log = vi.fn();
    const boom = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    const result = await runAction(async () => {
      throw boom;
    }, log);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNEXPECTED");
      expect(result.error).not.toContain("ECONNREFUSED");
    }
    expect(log).toHaveBeenCalledTimes(1);
    const entry = log.mock.calls[0][0];
    expect(entry.code).toBe("UNEXPECTED");
    expect(entry.cause).toBe(boom);
  });

  it("logs Prisma connection failures as DB_UNAVAILABLE", async () => {
    const log = vi.fn();
    const result = await runAction(async () => {
      throw Object.assign(new Error("Can't reach database server"), {
        name: "PrismaClientInitializationError",
      });
    }, log);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DB_UNAVAILABLE");
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("lets Next redirects pass through untouched", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
    await expect(
      runAction(async () => {
        throw redirect;
      }),
    ).rejects.toBe(redirect);
  });
});
