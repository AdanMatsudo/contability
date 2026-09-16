import { ExternalServiceError } from "@/lib/errors";

const BASE = "https://brasilapi.com.br/api/cnpj/v1";
const TIMEOUT_MS = 5000;
const SERVICE = "BrasilAPI";
const USER_AGENT = "finance-app (personal finance importer)";

export interface CnpjInfo {
  cnpj: string;
  razaoSocial: string | null;
  cnaeCode: string | null;
  cnaeDescription: string | null;
}

interface Payload {
  razao_social?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
}

const digits = (input: string) => input.replace(/\D/g, "");

// Public lookup, no key, no cost. Not found is an answer (null); anything else
// failing is an outside problem the caller turns into a warning.
export async function fetchCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjInfo | null> {
  const clean = digits(cnpj);
  if (clean.length !== 14) return null;

  let response: Response;
  try {
    response = await fetch(`${BASE}/${clean}`, {
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
  } catch (cause) {
    throw new ExternalServiceError(SERVICE, cause);
  }

  // 404 is "no such company"; 400 is "these digits are not a valid CNPJ"
  // (checked against the live API on 2026-09-16). Both are answers, not outages.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new ExternalServiceError(SERVICE, new Error(`HTTP ${response.status}`));

  let payload: Payload;
  try {
    payload = (await response.json()) as Payload;
  } catch (cause) {
    throw new ExternalServiceError(SERVICE, cause);
  }

  const code = payload.cnae_fiscal;
  return {
    cnpj: clean,
    razaoSocial: payload.razao_social ?? null,
    cnaeCode: code === undefined || code === null ? null : String(code),
    cnaeDescription: payload.cnae_fiscal_descricao ?? null,
  };
}
