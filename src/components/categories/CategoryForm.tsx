"use client";

import { useState, useTransition } from "react";
import type { Category, CategoryKind } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { formatBRL } from "@/lib/money";
import { CATEGORY_PALETTE } from "@/services/categories/category.service";
import { Field, inputClass } from "@/components/ui/Field";

const KIND_LABEL: Record<CategoryKind, string> = {
  EXPENSE: "Saída",
  INCOME: "Entrada",
  TRANSFER: "Transferência",
};

export interface CategoryFormValues {
  name: string;
  kind: CategoryKind;
  budget: string;
  color?: string;
}

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (values: CategoryFormValues) => Promise<ActionResult<Category>>;
  onDone: () => void;
  submitLabel: string;
}

function budgetToInput(cents: number | null): string {
  return cents === null ? "" : formatBRL(cents).replace(/^R\$\s?/, "");
}

export function CategoryForm({ initial, onSubmit, onDone, submitLabel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? "EXPENSE");
  const [budget, setBudget] = useState(budgetToInput(initial?.budgetCents ?? null));
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ name, kind, budget, color });
      if (result.ok) {
        onDone();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_160px] gap-3">
        <Field label="Nome" error={errors.name?.[0]}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Tipo">
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)}>
            {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Orçamento mensal" error={errors.budget?.[0]}>
          <input
            className={inputClass}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="sem limite"
            inputMode="decimal"
            disabled={kind !== "EXPENSE"}
          />
        </Field>
      </div>
      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={
                "w-7 h-7 rounded-full border-2 " + (color === c ? "border-foreground" : "border-transparent")
              }
              style={{ background: c }}
            />
          ))}
          {!initial && (
            <span className="self-center text-xs text-muted">{color ? "" : "sem escolher, eu pego uma cor livre"}</span>
          )}
        </div>
      </Field>
      {error && <p className="text-sm text-[#a14d13]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium"
        >
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

export { KIND_LABEL };
