"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/actions/categories";
import type { CategoryKind } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import {
  filterAndSort,
  matchRange,
  type CategoryFilter,
  type CategorySort,
  type CategoryWithUsage,
  type KindFilter,
} from "@/services/categories/category-filter";
import { pickColor } from "@/services/categories/category.service";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { SidePanel } from "@/components/ui/SidePanel";
import { CategoryForm, KIND_LABEL, type CategoryFormValues } from "./CategoryForm";

const GROUPS: { kind: CategoryKind; title: string }[] = [
  { kind: "EXPENSE", title: "Saídas" },
  { kind: "INCOME", title: "Entradas" },
  { kind: "TRANSFER", title: "Transferências" },
];

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "EXPENSE", label: "Saídas" },
  { value: "INCOME", label: "Entradas" },
  { value: "TRANSFER", label: "Transf." },
];

const SORT_OPTIONS: { value: CategorySort; label: string }[] = [
  { value: "name", label: "Nome A–Z" },
  { value: "budget", label: "Maior orçamento" },
  { value: "usage", label: "Mais usadas" },
];

type Panel = { mode: "create"; name: string } | { mode: "edit"; id: string } | null;

interface Props {
  categories: CategoryWithUsage[];
  initialFilter: CategoryFilter;
  usageDays: number;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function CategoriesManager({ categories, initialFilter, usageDays }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<CategoryFilter>(initialFilter);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<CategoryFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [deleting, startDelete] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterAndSort(categories, filter), [categories, filter]);
  const editing = panel?.mode === "edit" ? categories.find((c) => c.id === panel.id) : undefined;
  const searching = filter.q.trim().length > 0;

  // Keep the URL in step with the filter so reload and back restore the view.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.kind !== "ALL") params.set("kind", filter.kind);
    if (filter.sort !== "name") params.set("sort", filter.sort);
    const qs = params.toString();
    const timer = setTimeout(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }), 200);
    return () => clearTimeout(timer);
  }, [filter, pathname, router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA");
      if (event.key === "/" && !typing && !panel) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const closePanel = useCallback(() => {
    setPanel(null);
    setDraft(null);
  }, []);

  function openCreate(name = "") {
    setMessage(null);
    setError(null);
    setPanel({ mode: "create", name });
  }

  function openEdit(id: string) {
    setMessage(null);
    setError(null);
    setPanel({ mode: "edit", id });
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setFilter((f) => ({ ...f, q: "" }));
      searchRef.current?.blur();
    }
    if (event.key === "Enter" && visible.length === 1) openEdit(visible[0].id);
  }

  function remove(category: CategoryWithUsage) {
    const sure = window.confirm(
      `Apagar "${category.name}"? Os lançamentos dela ficam sem categoria; regras e mapeamentos dela somem.`,
    );
    if (!sure) return;
    startDelete(async () => {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        closePanel();
        setMessage(`"${category.name}" apagada. ${result.data.movedTransactions} lançamentos ficaram sem categoria.`);
      } else {
        setError({ message: result.error, code: result.code });
      }
    });
  }

  const ghostColor = draft?.color ?? pickColor(categories.map((c) => c.color));
  const budgetSum = (items: CategoryWithUsage[]) => items.reduce((sum, c) => sum + (c.budgetCents ?? 0), 0);

  function renderGrid(items: CategoryWithUsage[], showGhost: boolean) {
    return (
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {items.map((category) => {
          const selected = panel?.mode === "edit" && panel.id === category.id;
          const dimmed = panel !== null && !selected;
          const range = matchRange(category.name, filter.q);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => openEdit(category.id)}
              aria-pressed={selected}
              className={
                "group text-left flex flex-col gap-2 rounded-[20px] bg-surface p-4 transition-all duration-150 " +
                "shadow-[0_1px_2px_rgba(17,17,16,0.04)] hover:shadow-[0_6px_20px_rgba(17,17,16,0.08)] hover:-translate-y-0.5 " +
                (selected ? "-translate-y-0.5 shadow-[0_8px_24px_rgba(17,17,16,0.10)] " : "") +
                (dimmed ? "opacity-60 " : "")
              }
              style={selected ? { boxShadow: `0 0 0 2px ${category.color}, 0 8px 24px rgba(17,17,16,0.10)` } : undefined}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: category.color }} />
                <span className="text-sm font-medium truncate">
                  {range ? (
                    <>
                      {category.name.slice(0, range[0])}
                      <mark className="bg-[#fff1b8] text-foreground rounded-sm">{category.name.slice(range[0], range[1])}</mark>
                      {category.name.slice(range[1])}
                    </>
                  ) : (
                    category.name
                  )}
                </span>
                {filter.kind === "ALL" ? null : (
                  <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-muted">{KIND_LABEL[category.kind]}</span>
                )}
              </div>
              <span className="text-sm text-muted">
                {category.budgetCents === null ? "sem orçamento" : `${formatBRL(category.budgetCents)} / mês`}
              </span>
              <span className="text-xs text-muted/80">
                {category.usageCount === 0
                  ? `sem uso em ${usageDays} dias`
                  : `${category.usageCount}× em ${usageDays} dias`}
              </span>
            </button>
          );
        })}
        {showGhost && (
          <div
            aria-hidden
            className="flex flex-col gap-2 rounded-[20px] border-2 border-dashed p-4"
            style={{ borderColor: ghostColor }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ghostColor }} />
              <span className="text-sm font-medium truncate text-foreground/80">{draft?.name?.trim() || "Nova categoria"}</span>
            </div>
            <span className="text-sm text-muted">{draft?.budget?.trim() ? `R$ ${draft.budget.trim()} / mês` : "sem orçamento"}</span>
            <span className="text-xs text-muted/80">nascendo…</span>
          </div>
        )}
      </div>
    );
  }

  const creating = panel?.mode === "create";
  const ghostKind: CategoryKind = draft?.kind ?? "EXPENSE";

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/90 backdrop-blur flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <input
            ref={searchRef}
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={onSearchKey}
            placeholder="Buscar categoria…"
            aria-label="Buscar categoria"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-3 pr-10 text-sm outline-none focus:border-foreground"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded-md border border-border bg-background text-[10px] text-muted font-mono">
            /
          </kbd>
        </label>
        <div className="flex gap-1 p-1 rounded-full bg-surface border border-border">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, kind: opt.value }))}
              aria-pressed={filter.kind === opt.value}
              className={
                "h-8 px-3.5 rounded-full text-xs font-medium transition-colors " +
                (filter.kind === opt.value ? "bg-foreground text-white" : "text-muted hover:text-foreground")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={filter.sort}
          onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as CategorySort }))}
          aria-label="Ordenar"
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-foreground"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => openCreate()}
          className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium"
        >
          Nova categoria
        </button>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
      {error && !panel && <ErrorNotice message={error.message} code={error.code} />}

      {visible.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-4 rounded-[20px] bg-surface px-6 py-14 text-center">
          <p className="text-sm text-muted">
            {searching ? (
              <>
                Nenhuma categoria com <span className="font-medium text-foreground">“{filter.q.trim()}”</span>.
              </>
            ) : (
              "Nenhuma categoria aqui."
            )}
          </p>
          <button
            type="button"
            onClick={() => openCreate(capitalize(filter.q.trim()))}
            className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium"
          >
            {searching ? `Criar “${capitalize(filter.q.trim())}”` : "Criar categoria"}
          </button>
        </div>
      ) : filter.kind === "ALL" ? (
        GROUPS.map((group) => {
          const items = visible.filter((c) => c.kind === group.kind);
          const ghostHere = creating && ghostKind === group.kind;
          if (items.length === 0 && !ghostHere) return null;
          const sum = budgetSum(items);
          return (
            <section key={group.kind} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {group.title}
                <span className="font-normal normal-case tracking-normal">
                  · {items.length} {items.length === 1 ? "categoria" : "categorias"}
                  {group.kind === "EXPENSE" && sum > 0 ? ` · ${formatBRL(sum)} / mês orçados` : ""}
                </span>
              </h2>
              {renderGrid(items, ghostHere)}
            </section>
          );
        })
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {visible.length} {visible.length === 1 ? "categoria" : "categorias"}
            {filter.kind === "EXPENSE" && budgetSum(visible) > 0 ? ` · ${formatBRL(budgetSum(visible))} / mês orçados` : ""}
          </h2>
          {renderGrid(visible, creating && ghostKind === filter.kind)}
        </section>
      )}

      <SidePanel
        open={panel !== null}
        onClose={closePanel}
        title={
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-full shrink-0 transition-colors"
              style={{ background: editing ? (draft?.color ?? editing.color) : ghostColor }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {editing ? "Editar categoria" : "Nova categoria"}
              </p>
              <p className="text-base font-semibold truncate">
                {(draft?.name ?? editing?.name)?.trim() || (editing ? editing.name : "Sem nome ainda")}
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closePanel}
                className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="category-form"
                disabled={saving}
                className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium disabled:opacity-40"
              >
                {saving ? "Salvando…" : editing ? "Salvar" : "Criar"}
              </button>
            </div>
            {editing && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => remove(editing)}
                className="self-center text-xs font-medium text-[#a14d13] hover:underline disabled:opacity-40"
              >
                {deleting ? "Apagando…" : "Apagar esta categoria"}
              </button>
            )}
            {error && panel && <ErrorNotice message={error.message} code={error.code} />}
          </div>
        }
      >
        {panel && (
          <CategoryForm
            key={panel.mode === "edit" ? panel.id : "create"}
            formId="category-form"
            initial={editing}
            initialName={panel.mode === "create" ? panel.name : undefined}
            onSubmit={(values) => (editing ? updateCategory(editing.id, values) : createCategory(values))}
            onDone={closePanel}
            onChange={setDraft}
            onPendingChange={setSaving}
          />
        )}
      </SidePanel>
    </div>
  );
}
