import { type ErrorCode, type FieldErrors, normalizeError } from "./errors";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: ErrorCode, error: string, fieldErrors?: FieldErrors): ActionResult<T> {
  return { ok: false, code, error, fieldErrors };
}

export interface ErrorLogEntry {
  code: ErrorCode;
  message: string;
  cause: unknown;
}

export type ErrorLogger = (entry: ErrorLogEntry) => void;

const defaultLogger: ErrorLogger = (entry) => console.error("[action]", entry);

// Next signals redirect()/notFound() by throwing; those must keep propagating.
function isNextControlFlow(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    /^NEXT_/.test((err as { digest: string }).digest)
  );
}

// The only try/catch in the action layer. AppErrors are expected outcomes and
// are not logged; anything else is unexpected, gets logged with its cause and
// reaches the screen only as a code plus a generic message.
export async function runAction<T>(fn: () => Promise<T>, log: ErrorLogger = defaultLogger): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    const normalized = normalizeError(err);
    if (normalized.code === "UNEXPECTED" || normalized.code === "DB_UNAVAILABLE") {
      log({ code: normalized.code, message: normalized.message, cause: normalized.cause });
    }
    return fail(normalized.code, normalized.message, normalized.fieldErrors);
  }
}
