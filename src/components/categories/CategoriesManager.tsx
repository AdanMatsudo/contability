"use client";

import { useState, useTransition } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/actions/categories";
import type { Category, CategoryKind } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import { CategoryForm, KIND_LABEL } from "./CategoryForm";

const GROUPS: { kind: CategoryKind; title: string }[] = [
  { kind: "EXPENSE", title: "Saídas" },
  { kind: "INCOME", title: "Entradas" },
  { kind: "TRANSFER", title: "Transferências" },
];

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(category: Category) {
    const sure = window.confirm(
      `Apagar "${category.name}"? Os lançamentos dela ficam sem categoria; regras e mapeamentos dela somem.`,
    );
    if (!sure) return;
    start(async () => {
      const result = await deleteCategory(category.id);
      setMessage(
        result.ok
          ? `"${category.name}" apagada. ${result.data.movedTransactions} lançamentos ficaram sem categoria.`
          : (result.error ?? "Não deu pra apagar."),
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{categories.length} categorias</p>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setCreating(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-foreground text-white text-[13px] font-medium"
          >
            Nova categoria
          </button>
        )}
      </div>

      {creating && (
        <CategoryForm
          submitLabel="Criar"
          onSubmit={(values) => createCategory(values)}
          onDone={() => setCreating(false)}
        />
      )}

      {message && <p className="text-sm text-muted">{message}</p>}

      {GROUPS.map((group) => {
        const items = categories.filter((c) => c.kind === group.kind);
        if (items.length === 0) return null;
        return (
          <section key={group.kind} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{group.title}</h2>
            <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
              {items.map((category) =>
                editingId === category.id ? (
                  <div key={category.id} className="p-2">
                    <CategoryForm
                      initial={category}
                      submitLabel="Salvar"
                      onSubmit={(values) => updateCategory(category.id, values)}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={category.id}
                    className="grid grid-cols-[20px_minmax(0,1fr)_140px_180px_auto] items-center gap-4 px-6 py-3 border-b border-[#f1f0ed] last:border-b-0"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: category.color }} />
                    <span className="text-sm font-medium truncate">{category.name}</span>
                    <span className="text-xs text-muted">{KIND_LABEL[category.kind]}</span>
                    <span className="text-sm text-muted">
                      {category.budgetCents === null ? "sem orçamento" : `${formatBRL(category.budgetCents)} / mês`}
                    </span>
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCreating(false);
                          setEditingId(category.id);
                        }}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(category)}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-[#fff4e8] hover:text-[#a14d13]"
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
