import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ExternalServiceError,
  NotFoundError,
  UnauthorizedError,
  UnexpectedError,
  ValidationError,
  normalizeError,
} from "./errors";

describe("AppError family", () => {
  it("carries a code and a screen-safe message", () => {
    const err = new ConflictError('Já existe a categoria "Casa".');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe('Já existe a categoria "Casa".');
    expect(err.name).toBe("ConflictError");
  });

  it("ValidationError carries field errors and a default message", () => {
    const err = new ValidationError({ name: ["Dê um nome à categoria."] });
    expect(err.code).toBe("VALIDATION");
    expect(err.message).toBe("Dados inválidos.");
    expect(err.fieldErrors).toEqual({ name: ["Dê um nome à categoria."] });
  });

  it("NotFoundError and UnauthorizedError have fixed codes", () => {
    expect(new NotFoundError("Categoria não encontrada.").code).toBe("NOT_FOUND");
    expect(new UnauthorizedError().code).toBe("UNAUTHORIZED");
  });

  it("ExternalServiceError names the service and keeps the cause", () => {
    const cause = new Error("ECONNRESET");
    const err = new ExternalServiceError("BrasilAPI", cause);
    expect(err.code).toBe("EXTERNAL_UNAVAILABLE");
    expect(err.service).toBe("BrasilAPI");
    expect(err.message).toContain("BrasilAPI");
    expect(err.cause).toBe(cause);
  });

  it("UnexpectedError defaults to UNEXPECTED and hides the cause from the message", () => {
    const cause = new Error("secret internal detail");
    const err = new UnexpectedError(cause);
    expect(err.code).toBe("UNEXPECTED");
    expect(err.message).not.toContain("secret");
    expect(err.cause).toBe(cause);
  });
});

describe("normalizeError", () => {
  it("returns an AppError untouched", () => {
    const err = new NotFoundError("x");
    expect(normalizeError(err)).toBe(err);
  });

  it("maps Prisma unique violation (P2002) to CONFLICT", () => {
    const prisma = Object.assign(new Error("Unique constraint failed"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    const err = normalizeError(prisma);
    expect(err.code).toBe("CONFLICT");
    expect(err.cause).toBe(prisma);
  });

  it("maps Prisma record-not-found (P2025) to NOT_FOUND", () => {
    const prisma = Object.assign(new Error("Record to update not found"), {
      name: "PrismaClientKnownRequestError",
      code: "P2025",
    });
    expect(normalizeError(prisma).code).toBe("NOT_FOUND");
  });

  it("maps Prisma connection failures to DB_UNAVAILABLE", () => {
    const init = Object.assign(new Error("Can't reach database server"), {
      name: "PrismaClientInitializationError",
    });
    const known = Object.assign(new Error("Server has closed the connection"), {
      name: "PrismaClientKnownRequestError",
      code: "P1001",
    });
    expect(normalizeError(init).code).toBe("DB_UNAVAILABLE");
    expect(normalizeError(known).code).toBe("DB_UNAVAILABLE");
  });

  it("wraps a plain Error as UNEXPECTED without leaking its message", () => {
    const err = normalizeError(new Error("TypeError: x is undefined"));
    expect(err.code).toBe("UNEXPECTED");
    expect(err.message).not.toContain("undefined");
    expect(err.cause).toBeInstanceOf(Error);
  });

  it("wraps non-Error values too", () => {
    const err = normalizeError("boom");
    expect(err.code).toBe("UNEXPECTED");
    expect(err.cause).toBe("boom");
  });
});
