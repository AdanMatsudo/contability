"use client";

import type { Account, Category, Transaction, TransactionSource } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import { matchRange } from "@/lib/text";

const SOURCE_LABEL: Record<TransactionSource, string> = {
  MANUAL: "Manual",
  IMPORT: "Importado",
  RECEIPT: "Nota",
};

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onSelect?: (transaction: Transaction) => void;
  selectedId?: string | null;
  highlight?: string;
  emptyText: string;
}

const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function TransactionsTable({
  transactions,
  categories,
  accounts,
  onSelect,
  selectedId,
  highlight = "",
  emptyText,
}: TransactionsTableProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  if (transactions.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted">{emptyText}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.1em] text-muted">
          <th className="px-6 py-3 text-left font-semibold w-[72px]">Data</th>
          <th className="px-3 py-3 text-left font-semibold">Descrição</th>
          <th className="px-3 py-3 text-left font-semibold w-[190px]">Categoria</th>
          <th className="px-3 py-3 text-left font-semibold w-[150px]">Conta</th>
          <th className="px-3 py-3 text-left font-semibold w-[100px]">Origem</th>
          <th className="px-6 py-3 text-right font-semibold w-[140px]">Valor</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => {
          const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
          const range = matchRange(t.description, highlight);
          const selected = selectedId === t.id;
          return (
            <tr
              key={t.id}
              onClick={onSelect ? () => onSelect(t) : undefined}
              aria-selected={selected}
              className={
                "border-t border-[#f1f0ed] transition-colors " +
                (onSelect ? "cursor-pointer hover:bg-background/70 " : "") +
                (selected ? "bg-background" : "")
              }
            >
              <td className="px-6 py-3 text-muted tabular-nums">{dayMonth(t.date)}</td>
              <td className="px-3 py-3 font-medium truncate max-w-[320px]">
                {range ? (
                  <>
                    {t.description.slice(0, range[0])}
                    <mark className="bg-[#fff1b8] text-foreground rounded-sm">{t.description.slice(range[0], range[1])}</mark>
                    {t.description.slice(range[1])}
                  </>
                ) : (
                  t.description
                )}
              </td>
              <td className="px-3 py-3">
                {category ? (
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ background: category.color }} />
                    {category.name}
                  </span>
                ) : (
                  <span className="text-faint">sem categoria</span>
                )}
              </td>
              <td className="px-3 py-3 text-muted truncate">{accountById.get(t.accountId)?.name ?? "—"}</td>
              <td className="px-3 py-3">
                <span className="inline-flex h-6 items-center rounded-md bg-background px-2 text-[11px] font-medium text-muted">
                  {SOURCE_LABEL[t.source]}
                </span>
              </td>
              <td className={"px-6 py-3 text-right font-semibold tabular-nums " + (t.amountCents < 0 ? "text-foreground" : "text-income")}>
                {t.amountCents < 0 ? formatBRL(t.amountCents).replace(/^-/, "− ") : `+ ${formatBRL(t.amountCents)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
