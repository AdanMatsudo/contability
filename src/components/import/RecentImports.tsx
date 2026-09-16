"use client";

import { useState, useTransition } from "react";
import { undoImport } from "@/actions/import";
import type { ImportBatch } from "@/domain/types";
import { ErrorNotice } from "@/components/ui/ErrorNotice";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function RecentImports({ batches }: { batches: ImportBatch[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [pending, start] = useTransition();

  if (batches.length === 0) return null;

  function undo(batch: ImportBatch) {
    if (!window.confirm(`Desfazer "${batch.fileName}"? ${batch.importedCount} lançamentos somem; as regras aprendidas ficam.`)) return;
    start(async () => {
      const result = await undoImport(batch.id);
      if (result.ok) {
        setError(null);
        setMessage(`Importação desfeita: ${result.data.removed} lançamentos removidos.`);
      } else {
        setMessage(null);
        setError({ message: result.error, code: result.code });
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Importações recentes</h2>
      {message && <p className="text-sm text-muted">{message}</p>}
      {error && <ErrorNotice message={error.message} code={error.code} />}
      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        {batches.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-[110px_minmax(0,1fr)_160px_auto_auto] items-center gap-4 px-6 py-3 border-t border-[#f1f0ed] first:border-t-0 text-sm"
          >
            <span className="text-muted tabular-nums">{when(b.createdAt)}</span>
            <span className="font-medium truncate">{b.fileName}</span>
            <span className="text-muted truncate">{b.accountName}</span>
            <span className="text-xs text-muted tabular-nums whitespace-nowrap">
              {b.importedCount} importados · {b.duplicateCount} duplicados
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => undo(b)}
              className="h-8 px-3 rounded-lg text-xs font-medium text-muted hover:bg-[#fff4e8] hover:text-[#a14d13] disabled:opacity-40"
            >
              Desfazer
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
