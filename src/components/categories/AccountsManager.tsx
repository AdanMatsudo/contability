"use client";

import { useState, useTransition } from "react";
import { createAccount, deleteAccount, updateAccount } from "@/actions/accounts";
import type { Account, AccountType } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { Field, inputClass } from "@/components/ui/Field";

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
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ name, type });
      if (result.ok) {
        onDone();
        return;
      }
      setError(result.fieldErrors?.name?.[0] ?? result.error ?? "Não deu pra salvar.");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px] gap-3">
        <Field label="Nome" error={error}>
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
  const [pending, start] = useTransition();

  function remove(account: Account) {
    if (!window.confirm(`Apagar a conta "${account.name}"?`)) return;
    start(async () => {
      const result = await deleteAccount(account.id);
      setMessage(result.ok ? `"${account.name}" apagada.` : (result.error ?? "Não deu pra apagar."));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{accounts.length} contas</p>
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

      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        {accounts.map((account) =>
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
