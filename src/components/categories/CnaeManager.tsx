"use client";

import { useMemo, useState, useTransition } from "react";
import { createCnaeMapping, deleteCnaeMapping, updateCnaeMapping } from "@/actions/cnae";
import type { Category, CnaeMapping } from "@/domain/types";
import { matchRange } from "@/lib/text";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, inputClass } from "@/components/ui/Field";

interface Props {
  mappings: CnaeMapping[];
  categories: Category[];
}

// CNAE divisions, for the hint next to the prefix field. Not exhaustive: it is
// a reminder of what the first two digits mean, not a catalogue.
const DIVISION_HINT: Record<string, string> = {
  "35": "eletricidade e gás",
  "36": "água e saneamento",
  "45": "veículos",
  "46": "comércio atacadista",
  "47": "comércio varejista",
  "49": "transporte terrestre",
  "55": "hospedagem",
  "56": "alimentação",
  "59": "cinema e audiovisual",
  "61": "telecomunicações",
  "62": "software",
  "64": "serviços financeiros",
  "68": "atividades imobiliárias",
  "85": "educação",
  "86": "saúde humana",
  "90": "artes e cultura",
  "93": "esporte e lazer",
};

export function CnaeManager({ mappings, categories }: Props) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [pending, start] = useTransition();

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const visible = mappings.filter((m) => {
    if (!query.trim()) return true;
    const category = categoryById.get(m.categoryId);
    return m.cnaePrefix.startsWith(query.trim()) || (category ? matchRange(category.name, query) !== null : false);
  });

  function remove(mapping: CnaeMapping) {
    if (!window.confirm(`Apagar o mapeamento do prefixo ${mapping.cnaePrefix}?`)) return;
    start(async () => {
      const result = await deleteCnaeMapping(mapping.id);
      if (!result.ok) setError({ message: result.error, code: result.code });
      else setError(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-sm text-muted">
          Quando uma linha importada traz um CNPJ, eu consulto a atividade da empresa e uso estes prefixos pra escolher a
          categoria. O prefixo mais longo que casar vence.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prefixo ou categoria…"
            aria-label="Buscar mapeamento"
            className="h-10 w-[220px] rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-foreground"
          />
          {!creating && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setCreating(true);
              }}
              className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium"
            >
              Novo mapeamento
            </button>
          )}
        </div>
      </div>

      {error && <ErrorNotice message={error.message} code={error.code} />}

      {creating && (
        <MappingForm
          categories={categories}
          submitLabel="Criar"
          onSubmit={(values) => createCnaeMapping(values)}
          onDone={() => setCreating(false)}
        />
      )}

      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        {visible.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted">Nenhum mapeamento com esse filtro.</p>}
        {visible.map((mapping) =>
          editingId === mapping.id ? (
            <div key={mapping.id} className="p-2">
              <MappingForm
                categories={categories}
                initial={mapping}
                submitLabel="Salvar"
                onSubmit={(values) => updateCnaeMapping(mapping.id, values)}
                onDone={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div
              key={mapping.id}
              className="grid grid-cols-[80px_minmax(0,1fr)_200px_auto] items-center gap-4 px-6 py-3 border-b border-[#f1f0ed] last:border-b-0"
            >
              <span className="font-mono text-sm">{mapping.cnaePrefix}</span>
              <span className="text-xs text-muted truncate">{DIVISION_HINT[mapping.cnaePrefix.slice(0, 2)] ?? ""}</span>
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: categoryById.get(mapping.categoryId)?.color ?? "#e6e5e1" }}
                />
                <span className="truncate">{categoryById.get(mapping.categoryId)?.name ?? "categoria apagada"}</span>
              </span>
              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditingId(mapping.id);
                  }}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(mapping)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-[#fff4e8] hover:text-[#a14d13] disabled:opacity-40"
                >
                  Apagar
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

interface FormProps {
  categories: Category[];
  initial?: CnaeMapping;
  submitLabel: string;
  onSubmit: (values: { cnaePrefix: string; categoryId: string }) => Promise<{ ok: boolean; error?: string; code?: string; fieldErrors?: Record<string, string[] | undefined> }>;
  onDone: () => void;
}

function MappingForm({ categories, initial, submitLabel, onSubmit, onDone }: FormProps) {
  const [cnaePrefix, setPrefix] = useState(initial?.cnaePrefix ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<{ message: string; code: string } | undefined>();
  const [pending, start] = useTransition();
  const hint = DIVISION_HINT[cnaePrefix.slice(0, 2)];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ cnaePrefix: cnaePrefix.trim(), categoryId });
      if (result.ok) {
        onDone();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      const hasFieldErrors = result.fieldErrors && Object.keys(result.fieldErrors).length > 0;
      setError(hasFieldErrors ? undefined : { message: result.error ?? "Não deu pra salvar.", code: result.code ?? "UNEXPECTED" });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-3">
        <Field label="Prefixo CNAE" error={errors.cnaePrefix?.[0]}>
          <input
            className={inputClass + " font-mono"}
            value={cnaePrefix}
            onChange={(e) => setPrefix(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4711"
            inputMode="numeric"
            autoFocus
          />
        </Field>
        <Field label="Categoria" error={errors.categoryId?.[0]}>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {hint && <p className="text-xs text-muted">Divisão {cnaePrefix.slice(0, 2)}: {hint}.</p>}
      {error && <ErrorNotice message={error.message} code={error.code} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium disabled:opacity-40"
        >
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
