"use client";

import { useEffect, useState, useTransition } from "react";
import type { Category, CategoryKind } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { formatBRL } from "@/lib/money";
import { CATEGORY_PALETTE } from "@/services/categories/category.service";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
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
  formId: string;
  initial?: Category;
  initialName?: string;
  onSubmit: (values: CategoryFormValues) => Promise<ActionResult<Category>>;
  onDone: () => void;
  onChange?: (values: CategoryFormValues) => void;
  onPendingChange?: (pending: boolean) => void;
}

function budgetToInput(cents: number | null): string {
  return cents === null ? "" : formatBRL(cents).replace(/^R\$\s?/, "");
}

// Lives inside the SidePanel; the submit button sits in the panel footer and
// targets this form by id, so the footer stays fixed while the form scrolls.
export function CategoryForm({
  formId,
  initial,
  initialName,
  onSubmit,
  onDone,
  onChange,
  onPendingChange,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? initialName ?? "");
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? "EXPENSE");
  const [budget, setBudget] = useState(budgetToInput(initial?.budgetCents ?? null));
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<{ message: string; code: string } | undefined>();
  const [pending, start] = useTransition();

  useEffect(() => {
    onChange?.({ name, kind, budget, color });
  }, [name, kind, budget, color, onChange]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ name, kind, budget, color });
      if (result.ok) {
        onDone();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      const hasFieldErrors = result.fieldErrors && Object.keys(result.fieldErrors).length > 0;
      setError(hasFieldErrors ? undefined : { message: result.error, code: result.code });
    });
  }

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Nome" error={errors.name?.[0]}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Tipo">
        <div className="flex gap-1 p-1 rounded-xl bg-background">
          {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={
                "flex-1 h-8 rounded-lg text-xs font-medium transition-colors " +
                (kind === k ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(17,17,16,0.08)]" : "text-muted")
              }
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Orçamento mensal" error={errors.budget?.[0]}>
        <input
          className={inputClass}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder={kind === "EXPENSE" ? "sem limite" : "só pra saídas"}
          inputMode="decimal"
          disabled={kind !== "EXPENSE"}
        />
      </Field>
      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={
                "w-8 h-8 rounded-full border-2 transition-transform " +
                (color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105")
              }
              style={{ background: c }}
            />
          ))}
        </div>
        {!initial && !color && <span className="text-xs text-muted">Sem escolher, eu pego uma cor livre.</span>}
      </Field>
      {error && <ErrorNotice message={error.message} code={error.code} />}
    </form>
  );
}

export { KIND_LABEL };
