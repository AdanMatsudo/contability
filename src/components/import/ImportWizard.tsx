"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { confirmImport, prepareImport, saveCsvMapping } from "@/actions/import";
import type { ColumnMapping } from "@/adapters/parsers/generic-csv";
import { FORMAT_LABEL } from "@/adapters/parsers/types";
import type { Account, CategorizedBy, Category } from "@/domain/types";
import { formatBRL } from "@/lib/money";
import { suggestAccount } from "@/services/import/account-suggest";
import type { Decision } from "@/services/import/confirm";
import type { ReviewRow } from "@/services/import/prepare";
import { EXCLUDED_KEY, applyChoice, groupForReview, rulesToLearn, setLearn } from "@/services/import/review";
import { StackedBar } from "@/components/charts/StackedBar";
import type { ImportResult, PreparedImport } from "@/services/import/import.service";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, inputClass } from "@/components/ui/Field";

interface Props {
  accounts: Account[];
  categories: Category[];
}

type Step = { name: "upload" } | { name: "mapping"; prepared: PreparedImport; file: File } | { name: "review"; prepared: PreparedImport } | { name: "done"; result: ImportResult; prepared: PreparedImport };

const ORIGIN_LABEL: Record<CategorizedBy, string> = { RULE: "Regra", CNPJ: "CNPJ", AI: "IA", MANUAL: "Você" };
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const stepClass = (active: boolean, done: boolean) =>
  "flex items-center gap-2 text-xs font-medium " + (active ? "text-foreground" : done ? "text-muted" : "text-faint");

export function ImportWizard({ accounts, categories }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "upload" });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const stepIndex = step.name === "upload" ? 0 : step.name === "mapping" ? 0 : step.name === "review" ? 1 : 2;

  function fail(result: { error: string; code: string }) {
    setError({ message: result.error, code: result.code });
  }

  function upload(file: File, mapping?: ColumnMapping, account: string = accountId, allowSwitch = true) {
    setError(null);
    if (allowSwitch) setNotice(null);
    setFileName(file.name);
    const data = new FormData();
    data.set("file", file);
    data.set("accountId", account);
    if (mapping) data.set("mapping", JSON.stringify(mapping));
    start(async () => {
      const result = await prepareImport(data);
      if (!result.ok) return fail(result);
      const prepared = result.data;
      // A card file on a non-card account: switch once and re-read, since hashes carry the account.
      const suggested = allowSwitch ? suggestAccount(prepared.format, accounts, account) : null;
      if (suggested) {
        const name = accounts.find((a) => a.id === suggested)?.name ?? "";
        setAccountId(suggested);
        setNotice(`Troquei a conta pra "${name}" porque o arquivo é ${FORMAT_LABEL[prepared.format]}. Volte se não for isso.`);
        upload(file, mapping, suggested, false);
        return;
      }
      if (prepared.format === "unknown") {
        setError({ message: "Não reconheci esse arquivo. Aceito CSV do Nubank (conta ou cartão), OFX e CSV com cabeçalho.", code: "UNKNOWN_FORMAT" });
        return;
      }
      if (prepared.needsMapping) {
        setStep({ name: "mapping", prepared, file });
        return;
      }
      if (prepared.rows.length === 0) {
        setError({
          message: `Reconheci o formato (${FORMAT_LABEL[prepared.format]}), mas não consegui ler nenhuma linha. Me mande esse arquivo pra eu ajustar o leitor.`,
          code: "PARSE_EMPTY",
        });
        return;
      }
      setDecisions(Object.fromEntries(prepared.rows.map((r) => [r.index, { index: r.index, included: r.included, categoryId: r.categoryId }])));
      setStep({ name: "review", prepared });
    });
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) upload(file);
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function confirm(prepared: PreparedImport) {
    setError(null);
    start(async () => {
      const result = await confirmImport({
        accountId: prepared.accountId,
        fileName: prepared.fileName,
        rows: prepared.rows,
        decisions: Object.values(decisions),
      });
      if (!result.ok) return fail(result);
      setStep({ name: "done", result: result.data, prepared });
      router.refresh();
    });
  }

  const accountName = accounts.find((a) => a.id === accountId)?.name ?? "";

  return (
    <section className="flex flex-col gap-5">
      <ol className="flex items-center gap-4">
        {["Arquivo", "Revisão", "Pronto"].map((label, i) => (
          <li key={label} className={stepClass(i === stepIndex, i < stepIndex)}>
            <span
              className={
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] " +
                (i === stepIndex ? "bg-foreground text-white" : i < stepIndex ? "bg-border text-foreground" : "bg-background text-faint")
              }
            >
              {i < stepIndex ? "✓" : i + 1}
            </span>
            {label}
            {i < 2 && <span className="w-8 h-px bg-border" />}
          </li>
        ))}
      </ol>

      {error && <ErrorNotice message={error.message} code={error.code} />}
      {notice && <p className="text-sm text-muted">{notice}</p>}

      {step.name === "upload" && (
        <div className="rounded-[20px] bg-surface p-6 shadow-[0_1px_2px_rgba(17,17,16,0.04)] flex flex-col gap-5">
          <Field label="Conta do extrato" className="max-w-[320px]">
            <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            disabled={pending || !accountId}
            className="flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-border px-6 py-14 text-center hover:border-foreground/40 hover:bg-background/60 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{pending ? `Lendo ${fileName ?? "arquivo"}…` : "Solte o extrato aqui ou clique pra escolher"}</span>
            <span className="text-xs text-muted">CSV do Nubank (conta ou cartão), OFX de qualquer banco, ou CSV com cabeçalho. Até 2 MB.</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.ofx,.txt,text/csv,application/x-ofx" className="hidden" onChange={onFile} />
        </div>
      )}

      {step.name === "mapping" && (
        <MappingStep
          prepared={step.prepared}
          onCancel={() => setStep({ name: "upload" })}
          pending={pending}
          onApply={(mapping, remember) => {
            start(async () => {
              if (remember && step.prepared.signature) await saveCsvMapping(step.prepared.signature, mapping);
              upload(step.file, mapping);
            });
          }}
        />
      )}

      {step.name === "review" && (
        <ReviewStep
          prepared={step.prepared}
          accountName={accountName}
          categories={categories}
          decisions={decisions}
          setDecisions={setDecisions}
          pending={pending}
          onBack={() => setStep({ name: "upload" })}
          onConfirm={() => confirm(step.prepared)}
        />
      )}

      {step.name === "done" && (
        <DoneStep
          result={step.result}
          prepared={step.prepared}
          categories={categories}
          onAgain={() => {
            setStep({ name: "upload" });
            setDecisions({});
          }}
        />
      )}
    </section>
  );
}

function MappingStep({
  prepared,
  onApply,
  onCancel,
  pending,
}: {
  prepared: PreparedImport;
  onApply: (mapping: ColumnMapping, remember: boolean) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const headers = prepared.headers ?? [];
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: headers[0] ?? "",
    amount: headers[1] ?? "",
    description: headers[2] ?? "",
    dateFormat: "dmy",
    invertSign: false,
  });
  const [remember, setRemember] = useState(true);
  const select = (key: "date" | "amount" | "description", label: string) => (
    <Field label={label}>
      <select className={inputClass} value={mapping[key]} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="rounded-[20px] bg-surface p-6 shadow-[0_1px_2px_rgba(17,17,16,0.04)] flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium">CSV com cabeçalho que eu não conheço. Diga qual coluna é o quê.</p>
        <p className="text-xs text-muted mt-1">{prepared.fileName} · {headers.length} colunas</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {select("date", "Data")}
        {select("amount", "Valor")}
        {select("description", "Descrição")}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Formato da data">
          <select
            className={inputClass}
            value={mapping.dateFormat}
            onChange={(e) => setMapping({ ...mapping, dateFormat: e.target.value as ColumnMapping["dateFormat"] })}
          >
            <option value="dmy">dd/mm/aaaa</option>
            <option value="ymd">aaaa-mm-dd</option>
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2.5 text-sm">
          <input type="checkbox" checked={mapping.invertSign} onChange={(e) => setMapping({ ...mapping, invertSign: e.target.checked })} />
          Inverter sinal (extrato de cartão: positivo = compra)
        </label>
        <label className="flex items-end gap-2 pb-2.5 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Lembrar pra próxima vez
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-background text-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(prepared.preview ?? []).map((row, i) => (
              <tr key={i} className="border-t border-[#f1f0ed]">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 truncate max-w-[220px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onApply(mapping, remember)}
          className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium disabled:opacity-40"
        >
          {pending ? "Lendo…" : "Usar estas colunas"}
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  prepared,
  accountName,
  categories,
  decisions,
  setDecisions,
  pending,
  onBack,
  onConfirm,
}: {
  prepared: PreparedImport;
  accountName: string;
  categories: Category[];
  decisions: Record<number, Decision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<number, Decision>>>;
  pending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const rows = prepared.rows;
  const included = rows.filter((r) => !r.duplicate && decisions[r.index]?.included);
  const missing = included.filter((r) => !decisions[r.index]?.categoryId).length;
  const duplicates = rows.filter((r) => r.duplicate).length;
  const learning = useMemo(() => rulesToLearn(rows, decisions), [rows, decisions]);
  const groups = useMemo(() => groupForReview(rows, decisions, categories), [rows, decisions, categories]);
  const expenseTotal = groups.reduce((sum, g) => sum + g.expenseCents, 0);
  const incomeTotal = groups.reduce((sum, g) => sum + g.incomeCents, 0);
  // The bar reads largest first; the list below keeps "Sem categoria" on top,
  // where the work is.
  const slices = groups
    .filter((g) => g.key !== EXCLUDED_KEY && g.expenseCents > 0)
    .map((g) => ({ key: g.key, name: g.name, color: g.color, value: g.expenseCents }))
    .sort((a, b) => b.value - a.value);
  const visibleGroups = filterKey ? groups.filter((g) => g.key === filterKey) : groups;
  // The first row that carries a pattern owns the rule decision; siblings only inherit the category.
  const patternOwner = useMemo(() => {
    const owner = new Map<string, number>();
    for (const d of Object.values(decisions).sort((a, b) => a.index - b.index)) {
      if (d.included && d.categoryId && d.pattern && !owner.has(d.pattern)) owner.set(d.pattern, d.index);
    }
    return owner;
  }, [decisions]);

  function setDecision(index: number, patch: Partial<Decision>) {
    setDecisions((d) => ({ ...d, [index]: { ...d[index], ...patch } }));
  }

  function choose(index: number, categoryId: string | null) {
    setDecisions((d) => applyChoice(rows, d, index, categoryId));
  }

  function renderRow(r: ReviewRow) {
    const decision = decisions[r.index];
    const active = !r.duplicate && decision?.included;
    const chosen = decision?.categoryId ?? null;
    const changed = chosen !== r.categoryId;
    const color = chosen ? categoryById.get(chosen)?.color : undefined;
    const ownsPattern = !decision?.pattern || patternOwner.get(decision.pattern) === r.index;
    return (
      <tr key={r.index} className={"border-t border-[#f1f0ed] " + (active ? "" : "opacity-50")}>
        <td className="px-5 py-2.5">
          <input
            type="checkbox"
            disabled={r.duplicate}
            checked={!!active}
            onChange={(e) => setDecision(r.index, { included: e.target.checked })}
            aria-label="Incluir"
          />
        </td>
        <td className="px-2 py-2.5 text-muted tabular-nums">{dayMonth(r.date)}</td>
        <td className="px-2 py-2.5 max-w-[340px]">
          <p className="font-medium truncate" title={r.description}>
            {r.description}
          </p>
          {r.razaoSocial && (
            <p className="text-[11px] text-muted truncate" title={r.razaoSocial}>
              {r.razaoSocial}
            </p>
          )}
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color ?? "#e6e5e1" }} />
            <select
              disabled={!active}
              value={chosen ?? ""}
              onChange={(e) => choose(r.index, e.target.value || null)}
              className={
                "h-8 w-full rounded-lg border bg-surface px-2 text-xs outline-none focus:border-foreground " +
                (active && !chosen ? "border-[#eb6834]" : "border-border")
              }
            >
              <option value="">— escolher —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {active && chosen && changed && ownsPattern && (
            <div className="mt-1.5 flex items-center gap-2 pl-[18px] text-[11px] text-muted">
              <label
                className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Desmarcado: só este lançamento ganha a categoria. Marcado: toda descrição futura com esse trecho cai nela."
              >
                <input
                  type="checkbox"
                  checked={!!decision?.learn}
                  onChange={(e) => setDecisions((d) => setLearn(d, decision?.pattern ?? "", e.target.checked))}
                />
                criar regra
              </label>
              {decision?.learn ? (
                <input
                  value={decision?.pattern ?? ""}
                  onChange={(e) => setDecision(r.index, { pattern: e.target.value })}
                  onBlur={() => setDecisions((d) => applyChoice(rows, d, r.index, chosen, d[r.index]?.pattern))}
                  spellCheck={false}
                  aria-label="Trecho da regra"
                  className="h-6 w-full rounded-md border border-border bg-background px-1.5 font-mono text-[11px] text-foreground outline-none focus:border-foreground"
                />
              ) : (
                <span className="text-faint">só esta vez</span>
              )}
            </div>
          )}
        </td>
        <td className="px-2 py-2.5">
          {r.duplicate ? (
            <Badge>Já importada</Badge>
          ) : chosen && changed ? (
            <Badge>Você</Badge>
          ) : r.categorizedBy ? (
            <Badge>{ORIGIN_LABEL[r.categorizedBy]}</Badge>
          ) : (
            <span className="text-xs text-faint">—</span>
          )}
        </td>
        <td className={"px-5 py-2.5 text-right font-semibold tabular-nums " + (r.amountCents < 0 ? "" : "text-income")}>
          {r.amountCents < 0 ? formatBRL(r.amountCents).replace(/^-/, "− ") : `+ ${formatBRL(r.amountCents)}`}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 items-center rounded-full bg-surface border border-border px-3 text-xs font-medium">
            {FORMAT_LABEL[prepared.format]}
          </span>
          <span className="text-muted">
            {prepared.fileName} → {accountName}
          </span>
        </div>
        <span className="text-muted tabular-nums">
          {included.length} de {rows.length} entram{duplicates > 0 ? ` · ${duplicates} já importadas` : ""}
        </span>
      </div>

      {prepared.warnings.map((w) => (
        <ErrorNotice key={w} message={w} code="EXTERNAL_UNAVAILABLE" tone="warning" />
      ))}

      <section className="rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(17,17,16,0.04)] flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">O que entra</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              <span className="text-expense">− {formatBRL(expenseTotal)}</span>
              {incomeTotal > 0 && <span className="ml-3 text-base text-income">+ {formatBRL(incomeTotal)}</span>}
            </p>
          </div>
          {filterKey && (
            <button
              type="button"
              onClick={() => setFilterKey(null)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-background px-2.5 text-xs text-muted hover:text-foreground"
            >
              {groups.find((g) => g.key === filterKey)?.name} <span aria-hidden>×</span>
            </button>
          )}
        </div>
        <StackedBar
          slices={slices}
          selectedKey={filterKey}
          onSelect={(key) => setFilterKey((k) => (k === key ? null : key))}
          formatValue={formatBRL}
          emptyText="Nenhuma saída neste arquivo."
        />
      </section>

      <div className="rounded-[20px] bg-surface shadow-[0_1px_2px_rgba(17,17,16,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.1em] text-muted">
              <th className="px-5 py-3 w-10" />
              <th className="px-2 py-3 text-left font-semibold w-[72px]">Data</th>
              <th className="px-2 py-3 text-left font-semibold">Descrição</th>
              <th className="px-2 py-3 text-left font-semibold w-[230px]">Categoria</th>
              <th className="px-2 py-3 text-left font-semibold w-[90px]">Origem</th>
              <th className="px-5 py-3 text-right font-semibold w-[130px]">Valor</th>
            </tr>
          </thead>
          {visibleGroups.map((group) => (
            <tbody key={group.key}>
              <tr className="bg-background/70">
                <td colSpan={5} className="px-5 py-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                    {group.name}
                    <span className="font-normal text-muted">
                      · {group.rows.length} {group.rows.length === 1 ? "linha" : "linhas"}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-2 text-right text-xs font-semibold tabular-nums">
                  {group.expenseCents > 0 && <span>− {formatBRL(group.expenseCents)}</span>}
                  {group.incomeCents > 0 && <span className="ml-2 text-income">+ {formatBRL(group.incomeCents)}</span>}
                </td>
              </tr>
              {group.rows.map(renderRow)}
            </tbody>
          ))}
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          {learning.length > 0 && (
            <details className="relative text-xs text-muted">
              <summary className="cursor-pointer list-none rounded-lg px-2 py-1 hover:bg-surface">
                {learning.length} {learning.length === 1 ? "regra nova" : "regras novas"} ▸
              </summary>
              <ul className="absolute bottom-full right-0 mb-2 w-[380px] max-h-[320px] overflow-y-auto rounded-[16px] bg-surface p-3 shadow-[0_8px_24px_rgba(17,17,16,0.12)] flex flex-col gap-1.5">
                {learning.map((rule) => (
                  <li key={rule.pattern} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-background">
                    <span className="truncate">
                      <span className="font-mono text-foreground">{rule.pattern}</span>
                      <span className="text-muted"> → {categoryById.get(rule.categoryId)?.name ?? "?"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDecisions((d) => setLearn(d, rule.pattern, false))}
                      aria-label={`Não criar a regra ${rule.pattern}`}
                      className="w-6 h-6 shrink-0 rounded-full text-muted hover:bg-surface hover:text-foreground"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {missing > 0 && (
            <span className="text-xs text-[#a14d13]">
              {missing === 1 ? "1 linha incluída sem categoria" : `${missing} linhas incluídas sem categoria`}
            </span>
          )}
          <button
            type="button"
            disabled={pending || missing > 0 || included.length === 0}
            onClick={onConfirm}
            className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium disabled:opacity-40"
          >
            {pending ? "Gravando…" : `Confirmar ${included.length} ${included.length === 1 ? "lançamento" : "lançamentos"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  result,
  prepared,
  categories,
  onAgain,
}: {
  result: ImportResult;
  prepared: PreparedImport;
  categories: Category[];
  onAgain: () => void;
}) {
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  return (
    <div className="rounded-[20px] bg-surface p-6 shadow-[0_1px_2px_rgba(17,17,16,0.04)] flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Importação concluída</p>
        <p className="mt-1 text-[40px] leading-none font-semibold tracking-tight tabular-nums">
          {result.importedCount} <span className="text-lg font-medium text-muted">lançamentos</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {prepared.fileName} · {result.duplicateCount} já importados · {result.excludedCount} deixados de fora
        </p>
      </div>
      {result.learnedRules.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Regras aprendidas com você</p>
          <ul className="flex flex-wrap gap-2">
            {result.learnedRules.map((r) => (
              <li key={r.pattern} className="inline-flex h-7 items-center gap-2 rounded-full bg-background px-3 text-xs">
                <span className="font-mono">{r.pattern}</span>
                <span className="text-muted">→ {name(r.categoryId)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Na próxima importação essas descrições já vêm categorizadas.</p>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onAgain} className="h-10 px-4 rounded-xl bg-foreground text-white text-[13px] font-medium">
          Importar outro arquivo
        </button>
        <Link href="/" className="h-10 px-4 rounded-xl border border-border bg-surface text-[13px] font-medium flex items-center">
          Ver o mês
        </Link>
      </div>
      <p className="text-xs text-muted">Pra desfazer, use a lista de importações recentes abaixo.</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded-md bg-background px-2 text-[11px] font-medium text-muted">{children}</span>;
}
