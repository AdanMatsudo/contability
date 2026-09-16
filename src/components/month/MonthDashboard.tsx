"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Account, Category, Transaction } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import type { MonthSummary, MonthTotals } from "@/services/month/month.service";
import { applyTransactionFilter, type FlowFilter } from "@/services/transactions/transaction-filter";
import { MiniBars } from "@/components/charts/MiniBars";
import { MonthChart } from "@/components/charts/MonthChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { StackedBar } from "@/components/charts/StackedBar";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";

interface Props {
  summary: MonthSummary;
  history: MonthTotals[];
  insight: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  isCurrentMonth: boolean;
}

const FLOWS: { value: FlowFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "INCOME", label: "Entradas" },
  { value: "EXPENSE", label: "Saídas" },
];

const OTHERS_KEY = "__others__";
const NONE_KEY = "none";

export function MonthDashboard({ summary, history, insight, transactions, categories, accounts, isCurrentMonth }: Props) {
  const [flow, setFlow] = useState<FlowFilter>("ALL");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);

  const categoryFilter = categoryKey === OTHERS_KEY ? undefined : (categoryKey ?? undefined);
  const visible = useMemo(() => {
    const base = applyTransactionFilter(transactions, { flow, categoryId: categoryFilter, q: "" });
    if (categoryKey !== OTHERS_KEY) return base;
    const shown = new Set(summary.topCategories.slice(0, -1).map((c) => c.categoryId));
    return base.filter((t) => t.amountCents < 0 && !shown.has(t.categoryId));
  }, [transactions, flow, categoryFilter, categoryKey, summary.topCategories]);

  const selectedName =
    categoryKey === OTHERS_KEY
      ? "Outros"
      : categoryKey === NONE_KEY
        ? "Sem categoria"
        : categories.find((c) => c.id === categoryKey)?.name;

  const balance = summary.balanceCents;
  const cumulativeExpense = summary.days.reduce<number[]>((acc, d) => {
    acc.push((acc[acc.length - 1] ?? 0) + d.expenseCents);
    return acc;
  }, []);

  const stack = summary.topCategories.map((c) => ({
    key: c.name === "Outros" && c.categoryId === null ? OTHERS_KEY : (c.categoryId ?? NONE_KEY),
    name: c.name,
    color: c.color,
    value: c.expenseCents,
  }));

  function toggleCategory(key: string) {
    setCategoryKey((k) => (k === key ? null : key));
    setFlow("EXPENSE");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[20px] bg-surface p-7 shadow-[0_1px_2px_rgba(17,17,16,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {isCurrentMonth ? "Sobra até agora" : "Sobra do mês"}
            </p>
            <p
              className={
                "mt-1 text-[64px] leading-none font-semibold tracking-tight tabular-nums " +
                (balance < 0 ? "text-expense" : "text-foreground")
              }
            >
              {balance < 0 ? "− " : ""}
              {formatBRL(Math.abs(balance))}
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-muted">Entradas</p>
              <p className="font-semibold text-income tabular-nums">+ {formatBRL(summary.incomeCents)}</p>
            </div>
            <div>
              <p className="text-muted">Saídas</p>
              <p className="font-semibold text-expense tabular-nums">− {formatBRL(summary.expenseCents)}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <MonthChart days={summary.days} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Entradas" value={`+ ${formatBRL(summary.incomeCents)}`} valueClass="text-income">
          <MiniBars months={history} current={summary.month} metric="incomeCents" color="#1baf7a" />
          <p className="text-xs text-muted">últimos 6 meses</p>
        </Card>

        <Card title="Saídas" value={`− ${formatBRL(summary.expenseCents)}`} valueClass="text-expense">
          <Sparkline values={cumulativeExpense} color="#eb6834" />
          <ul className="flex flex-col gap-1.5">
            {summary.topCategories.slice(0, 4).map((c) => {
              const key = c.categoryId ?? NONE_KEY;
              const active = categoryKey === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(key)}
                    aria-pressed={active}
                    className={
                      "flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition-colors hover:bg-background " +
                      (active ? "bg-background font-medium" : "")
                    }
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto tabular-nums text-muted">{formatBRL(c.expenseCents)}</span>
                  </button>
                </li>
              );
            })}
            {summary.topCategories.length === 0 && <li className="text-xs text-muted">nenhuma saída ainda</li>}
          </ul>
        </Card>

        <Card title="Onde o dinheiro foi" value={null}>
          <p className="text-sm leading-relaxed">{insight}</p>
          <StackedBar
            slices={stack}
            onSelect={toggleCategory}
            selectedKey={categoryKey}
            formatValue={formatBRL}
            emptyText="Nenhuma saída neste mês."
          />
        </Card>
      </div>

      <section className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Lançamentos</h2>
            {selectedName && (
              <button
                type="button"
                onClick={() => setCategoryKey(null)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-background px-2.5 text-xs text-muted hover:text-foreground"
              >
                {selectedName} <span aria-hidden>×</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-full bg-background">
              {FLOWS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFlow(opt.value)}
                  aria-pressed={flow === opt.value}
                  className={
                    "h-7 px-3 rounded-full text-xs font-medium transition-colors " +
                    (flow === opt.value ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(17,17,16,0.08)]" : "text-muted")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Link href={`/transactions?month=${summary.month}`} className="text-xs font-medium text-muted hover:text-foreground">
              Abrir lançamentos →
            </Link>
          </div>
        </div>
        <TransactionsTable
          transactions={visible}
          categories={categories}
          accounts={accounts}
          emptyText={transactions.length === 0 ? "Nenhum lançamento neste mês." : "Nada com esse filtro."}
        />
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  valueClass,
  children,
}: {
  title: string;
  value: string | null;
  valueClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(17,17,16,0.04)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
        {value && <p className={"mt-1 text-xl font-semibold tabular-nums " + (valueClass ?? "")}>{value}</p>}
      </div>
      {children}
    </section>
  );
}
