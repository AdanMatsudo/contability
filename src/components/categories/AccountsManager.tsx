"use client";

import { useState, useTransition } from "react";
import { createAccount, deleteAccount, updateAccount } from "@/actions/accounts";
import type { Account, AccountType } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, inputClass } from "@/components/ui/Field";
import { matchRange } from "@/services/categories/category-filter";

const TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  CREDIT_CARD: "Cartão de crédito",
  CASH: "Dinheiro",
};

interface FormProps {
  initial?: Account;
  submitLabel: string;
  onSubmit: (values: { name: string; type: AccountType }) => Promise<ActionResult<Account>>;
  onDone: () => void;
}

function AccountForm({ initial, submitLabel, onSubmit, onDone }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "CHECKING");
  const [nameError, setNameError] = useState<string | undefined>();
  const [error, setError] = useState<{ message: string; code: string } | undefined>();
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ name, type });
      if (result.ok) {
        onDone();
        return;
      }
      const fieldError = result.fieldErrors?.name?.[0];
      setNameError(fieldError);
      setError(fieldError ? undefined : { message: result.error, code: result.code });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px] gap-3">
        <Field label="Nome" error={nameError}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Tipo">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>
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

export function AccountsManager({ accounts }: { accounts: Account[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const visible = accounts.filter((a) => !query.trim() || matchRange(a.name, query) !== null);

  function remove(account: Account) {
    if (!window.confirm(`Apagar a conta "${account.name}"?`)) return;
    start(async () => {
      const result = await deleteAccount(account.id);
      if (result.ok) {
        setError(null);
        setMessage(`"${account.name}" apagada.`);
      } else {
        setMessage(null);
        setError({ message: result.error, code: result.code });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar entre ${accounts.length} contas…`}
          aria-label="Buscar conta"
          className="h-10 flex-1 max-w-[320px] rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-foreground"
        />
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setCreating(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-foreground text-white text-[13px] font-medium"
          >
            Nova conta
          </button>
        )}
      </div>

      {creating && (
        <AccountForm submitLabel="Criar" onSubmit={(v) => createAccount(v)} onDone={() => setCreating(false)} />
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
      {error && <ErrorNotice message={error.message} code={error.code} />}

      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        {visible.length === 0 && <p className="px-6 py-8 text-sm text-muted">Nenhuma conta com esse nome.</p>}
        {visible.map((account) =>
          editingId === account.id ? (
            <div key={account.id} className="p-2">
              <AccountForm
                initial={account}
                submitLabel="Salvar"
                onSubmit={(v) => updateAccount(account.id, v)}
                onDone={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div
              key={account.id}
              className="grid grid-cols-[minmax(0,1fr)_180px_auto] items-center gap-4 px-6 py-3 border-b border-[#f1f0ed] last:border-b-0"
            >
              <span className="text-sm font-medium truncate">{account.name}</span>
              <span className="text-xs text-muted">{TYPE_LABEL[account.type]}</span>
              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditingId(account.id);
                  }}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(account)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-[#fff4e8] hover:text-[#a14d13]"
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
