"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createTransaction, deleteTransaction, updateTransaction } from "@/actions/transactions";
import type { Account, Category, Transaction } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import {
  applyTransactionFilter,
  type FlowFilter,
  type TransactionFilter,
} from "@/services/transactions/transaction-filter";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { SidePanel } from "@/components/ui/SidePanel";
import { TransactionForm, type TransactionFormValues } from "./TransactionForm";
import { TransactionsTable } from "./TransactionsTable";

const FLOW_OPTIONS: { value: FlowFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "INCOME", label: "Entradas" },
  { value: "EXPENSE", label: "Saídas" },
];

type Panel = { mode: "create" } | { mode: "edit"; id: string } | null;

interface Props {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  month: string;
  today: string;
  initialFilter: TransactionFilter;
}

export function TransactionsManager({ transactions, categories, accounts, month, today, initialFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<TransactionFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [deleting, startDelete] = useTransition();

  const visible = useMemo(() => applyTransactionFilter(transactions, filter), [transactions, filter]);
  const editing = panel?.mode === "edit" ? transactions.find((t) => t.id === panel.id) : undefined;
  const total = visible.reduce((sum, t) => sum + t.amountCents, 0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (filter.flow !== "ALL") params.set("flow", filter.flow);
    if (filter.categoryId) params.set("category", filter.categoryId);
    if (filter.q) params.set("q", filter.q);
    const qs = params.toString();
    const timer = setTimeout(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }), 200);
    return () => clearTimeout(timer);
  }, [filter, month, pathname, router]);

  const closePanel = useCallback(() => {
    setPanel(null);
    setDraft(null);
  }, []);

  function open(next: Panel) {
    setMessage(null);
    setError(null);
    setPanel(next);
  }

  function remove(transaction: Transaction) {
    if (!window.confirm(`Apagar "${transaction.description}" de ${formatBRL(Math.abs(transaction.amountCents))}?`)) return;
    startDelete(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.ok) {
        closePanel();
        setMessage("Lançamento apagado.");
      } else {
        setError({ message: result.error, code: result.code });
      }
    });
  }

  const headerAmount = draft?.amount || (editing ? formatBRL(Math.abs(editing.amountCents)).replace(/^R\$\s?/, "") : "");
  const headerKind = draft?.kind ?? (editing ? (editing.amountCents < 0 ? "EXPENSE" : "INCOME") : "EXPENSE");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-full bg-surface border border-border">
          {FLOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, flow: opt.value }))}
              aria-pressed={filter.flow === opt.value}
              className={
                "h-8 px-3.5 rounded-full text-xs font-medium transition-colors " +
                (filter.flow === opt.value ? "bg-foreground text-white" : "text-muted hover:text-foreground")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={filter.categoryId ?? ""}
          onChange={(e) => setFilter((f) => ({ ...f, categoryId: e.target.value || undefined }))}
          aria-label="Filtrar por categoria"
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-foreground"
        >
          <option value="">Todas as categorias</option>
          <option value="none">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={filter.q}
          onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
          placeholder="Buscar na descrição…"
          aria-label="Buscar na descrição"
          className="h-10 flex-1 min-w-[200px] rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-foreground"
        />
        <button
          type="button"
          onClick={() => open({ mode: "create" })}
          className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium"
        >
          Novo lançamento
        </button>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
      {error && !panel && <ErrorNotice message={error.message} code={error.code} />}

      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 text-xs text-muted">
          <span>
            {visible.length} {visible.length === 1 ? "lançamento" : "lançamentos"}
            {visible.length !== transactions.length ? ` de ${transactions.length}` : ""}
          </span>
          <span className="tabular-nums">
            saldo dos filtrados <span className={"font-semibold " + (total < 0 ? "text-foreground" : "text-income")}>{formatBRL(total)}</span>
          </span>
        </div>
        <TransactionsTable
          transactions={visible}
          categories={categories}
          accounts={accounts}
          onSelect={(t) => open({ mode: "edit", id: t.id })}
          selectedId={panel?.mode === "edit" ? panel.id : null}
          highlight={filter.q}
          emptyText={
            transactions.length === 0
              ? "Nenhum lançamento neste mês ainda. Comece pelo botão acima."
              : "Nenhum lançamento com esses filtros."
          }
        />
      </div>

      <SidePanel
        open={panel !== null}
        onClose={closePanel}
        title={
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {editing ? "Editar lançamento" : "Novo lançamento"}
            </p>
            <p className={"text-2xl font-semibold tabular-nums " + (headerKind === "EXPENSE" ? "text-expense" : "text-income")}>
              {headerKind === "EXPENSE" ? "− " : "+ "}R$ {headerAmount || "0,00"}
            </p>
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
                form="transaction-form"
                disabled={saving}
                className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium disabled:opacity-40"
              >
                {saving ? "Salvando…" : editing ? "Salvar" : "Lançar"}
              </button>
            </div>
            {editing && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => remove(editing)}
                className="self-center text-xs font-medium text-[#a14d13] hover:underline disabled:opacity-40"
              >
                {deleting ? "Apagando…" : "Apagar este lançamento"}
              </button>
            )}
            {error && panel && <ErrorNotice message={error.message} code={error.code} />}
          </div>
        }
      >
        {panel && (
          <TransactionForm
            key={panel.mode === "edit" ? panel.id : "create"}
            formId="transaction-form"
            initial={editing}
            today={today}
            accounts={accounts}
            categories={categories}
            onSubmit={(values) => (editing ? updateTransaction(editing.id, values) : createTransaction(values))}
            onDone={closePanel}
            onChange={setDraft}
            onPendingChange={setSaving}
          />
        )}
      </SidePanel>
    </div>
  );
}
