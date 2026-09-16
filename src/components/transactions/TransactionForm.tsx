"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Account, Category, Transaction } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { accountsForFlow } from "@/services/accounts/account.service";
import type { ManualFlow } from "@/services/transactions/transaction.service";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, inputClass } from "@/components/ui/Field";
import { maskBrl, MoneyInput } from "@/components/ui/MoneyInput";

export interface TransactionFormValues {
  kind: ManualFlow;
  amount: string;
  date: string;
  description: string;
  accountId: string;
  categoryId: string | null;
}

interface TransactionFormProps {
  formId: string;
  initial?: Transaction;
  today: string;
  accounts: Account[];
  categories: Category[];
  onSubmit: (values: TransactionFormValues) => Promise<ActionResult<Transaction>>;
  onDone: () => void;
  onChange?: (values: TransactionFormValues) => void;
  onPendingChange?: (pending: boolean) => void;
}

const FLOW_LABEL: Record<ManualFlow, string> = { EXPENSE: "Saída", INCOME: "Entrada" };

export function TransactionForm({
  formId,
  initial,
  today,
  accounts,
  categories,
  onSubmit,
  onDone,
  onChange,
  onPendingChange,
}: TransactionFormProps) {
  const [kind, setKind] = useState<ManualFlow>(initial ? (initial.amountCents < 0 ? "EXPENSE" : "INCOME") : "EXPENSE");
  const [amount, setAmount] = useState(initial ? maskBrl(String(Math.abs(initial.amountCents))) : "");
  const [date, setDate] = useState(initial?.date ?? today);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [chosenAccountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [chosenCategoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<{ message: string; code: string } | undefined>();
  const [pending, start] = useTransition();

  // Expense forms list expense and transfer categories; income forms list income ones.
  const options = useMemo(
    () => categories.filter((c) => (kind === "EXPENSE" ? c.kind !== "INCOME" : c.kind === "INCOME")),
    [categories, kind],
  );

  // Switching kind can leave a category or account that no longer fits: the
  // category becomes none, the account falls back to the first valid one.
  const categoryId = options.some((c) => c.id === chosenCategoryId) ? chosenCategoryId : null;
  const accountOptions = useMemo(() => accountsForFlow(accounts, kind), [accounts, kind]);
  const accountId = accountOptions.some((a) => a.id === chosenAccountId) ? chosenAccountId : (accountOptions[0]?.id ?? "");

  useEffect(() => {
    onChange?.({ kind, amount, date, description, accountId, categoryId });
  }, [kind, amount, date, description, accountId, categoryId, onChange]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit({ kind, amount, date, description, accountId, categoryId });
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
      <div className="flex gap-1 p-1 rounded-xl bg-background">
        {(Object.keys(FLOW_LABEL) as ManualFlow[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={
              "flex-1 h-9 rounded-lg text-sm font-medium transition-colors " +
              (kind === k
                ? k === "EXPENSE"
                  ? "bg-surface text-expense shadow-[0_1px_2px_rgba(17,17,16,0.08)]"
                  : "bg-surface text-income shadow-[0_1px_2px_rgba(17,17,16,0.08)]"
                : "text-muted")
            }
          >
            {FLOW_LABEL[k]}
          </button>
        ))}
      </div>
      <Field label="Valor" error={errors.amount?.[0]}>
        <MoneyInput value={amount} onChange={setAmount} autoFocus={!initial} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" error={errors.date?.[0]}>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} max="2999-12-31" />
        </Field>
        <Field label="Conta" error={errors.accountId?.[0]}>
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Categoria" error={errors.categoryId?.[0]}>
        <select className={inputClass} value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
          <option value="">Sem categoria</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição" error={errors.description?.[0]}>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={kind === "EXPENSE" ? "Padaria, Uber, mercado…" : "Salário, rendimento…"}
        />
      </Field>
      {error && <ErrorNotice message={error.message} code={error.code} />}
    </form>
  );
}
