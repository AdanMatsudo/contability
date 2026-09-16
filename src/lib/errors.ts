export type ErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EXTERNAL_UNAVAILABLE"
  | "DB_UNAVAILABLE"
  | "UNEXPECTED";

export type FieldErrors = Record<string, string[] | undefined>;

// Every error the app raises on purpose. `message` is safe to show on screen;
// `cause` is technical and only ever goes to the server log.
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options: { cause?: unknown; fieldErrors?: FieldErrors } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = options.cause;
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors: FieldErrors, message = "Dados inválidos.") {
    super("VALIDATION", message, { fieldErrors });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("CONFLICT", message, { cause });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("NOT_FOUND", message, { cause });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Acesso negado. Esta conta não está autorizada.") {
    super("UNAUTHORIZED", message);
  }
}

// An outside service failed. Flows treat it as a warning, never as a hard stop.
export class ExternalServiceError extends AppError {
  readonly service: string;

  constructor(service: string, cause?: unknown) {
    super("EXTERNAL_UNAVAILABLE", `${service} indisponível agora. Tente de novo mais tarde.`, { cause });
    this.service = service;
  }
}

export class UnexpectedError extends AppError {
  constructor(cause: unknown, code: "UNEXPECTED" | "DB_UNAVAILABLE" = "UNEXPECTED") {
    super(
      code,
      code === "DB_UNAVAILABLE" ? "Banco de dados indisponível agora." : "Algo deu errado. Tente de novo.",
      { cause },
    );
  }
}

// Prisma errors are recognised by shape so this module never imports Prisma.
interface PrismaLike {
  name?: string;
  code?: string;
}

function asPrisma(err: unknown): PrismaLike | null {
  if (!err || typeof err !== "object") return null;
  const name = (err as PrismaLike).name;
  return typeof name === "string" && name.startsWith("PrismaClient") ? (err as PrismaLike) : null;
}

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const prisma = asPrisma(err);
  if (prisma) {
    if (prisma.name === "PrismaClientInitializationError") return new UnexpectedError(err, "DB_UNAVAILABLE");
    if (prisma.code === "P2002") return new ConflictError("Já existe um registro igual.", err);
    if (prisma.code === "P2025") return new NotFoundError("Registro não encontrado.", err);
    if (prisma.code && /^P10\d\d$/.test(prisma.code)) return new UnexpectedError(err, "DB_UNAVAILABLE");
  }

  return new UnexpectedError(err);
}
