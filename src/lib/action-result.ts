export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  error?: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}
