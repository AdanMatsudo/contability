import type { CnpjInfo } from "@/adapters/brasilapi";
import type { CnaeMapping, CnpjCacheEntry } from "@/domain/types";

// CNAE codes are hierarchical: 4711302 is a supermarket inside retail 47.
// The longest configured prefix is the most specific answer.
export function mapCnae(code: string | null, mappings: CnaeMapping[]): string | null {
  if (!code) return null;
  const matches = mappings.filter((m) => code.startsWith(m.cnaePrefix));
  if (matches.length === 0) return null;
  return matches.reduce((best, m) => (m.cnaePrefix.length > best.cnaePrefix.length ? m : best)).categoryId;
}

// Keeps a free public API from being hit with dozens of parallel requests.
export async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

export interface ResolveDeps {
  mappings: CnaeMapping[];
  cached: (cnpjs: string[]) => Promise<CnpjCacheEntry[]>;
  fetchCnpj: (cnpj: string) => Promise<CnpjInfo | null>;
  save: (entries: CnpjCacheEntry[]) => Promise<void>;
  concurrency?: number;
}

export interface ResolveResult {
  // CNPJ → categoryId, only where a CNAE mapping matched.
  categories: Map<string, string>;
  // CNPJ → company name, for showing why a line was categorized.
  names: Map<string, string>;
  // CNPJ → CNAE, so the screen can offer to create the missing mapping.
  cnaes: Map<string, { code: string; description: string | null }>;
}

// Cache first (including "we asked and it does not exist"), then the network,
// then write what we learned. One request per distinct CNPJ.
export async function resolveCnpjs(cnpjs: string[], deps: ResolveDeps): Promise<ResolveResult> {
  const distinct = [...new Set(cnpjs.filter(Boolean))];
  const result: ResolveResult = { categories: new Map(), names: new Map(), cnaes: new Map() };
  if (distinct.length === 0) return result;

  const entries = await deps.cached(distinct);
  const known = new Map(entries.map((e) => [e.cnpj, e]));

  const missing = distinct.filter((c) => !known.has(c));
  const fetched = await runWithConcurrency(
    missing.map((cnpj) => async () => deps.fetchCnpj(cnpj)),
    deps.concurrency ?? 3,
  );

  const learned: CnpjCacheEntry[] = missing.map((cnpj, i) => {
    const info = fetched[i];
    return info
      ? { cnpj, found: true, razaoSocial: info.razaoSocial, cnaeCode: info.cnaeCode, cnaeDescription: info.cnaeDescription }
      : { cnpj, found: false, razaoSocial: null, cnaeCode: null, cnaeDescription: null };
  });
  if (learned.length > 0) await deps.save(learned);

  for (const entry of [...known.values(), ...learned]) {
    if (!entry.found) continue;
    if (entry.razaoSocial) result.names.set(entry.cnpj, entry.razaoSocial);
    if (entry.cnaeCode) result.cnaes.set(entry.cnpj, { code: entry.cnaeCode, description: entry.cnaeDescription });
    const categoryId = mapCnae(entry.cnaeCode, deps.mappings);
    if (categoryId) result.categories.set(entry.cnpj, categoryId);
  }
  return result;
}
