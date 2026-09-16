import { monthLabel } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { CategorySlice, MonthSummary } from "./month.service";

// Prose uses a plain space after R$ so the sentence wraps like text.
const brl = (cents: number) => formatBRL(cents).replace(/ /g, " ");

function joinPt(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function trend(current: MonthSummary, previous: MonthSummary, top: CategorySlice): string {
  const prevLabel = monthLabel(previous.month);
  const raw = ((current.expenseCents - previous.expenseCents) / previous.expenseCents) * 100;
  if (Math.abs(raw) < 1) return `Saídas ficaram no mesmo nível de ${prevLabel}.`;
  const pct = Math.round(raw);
  if (pct > 0) return `Saídas subiram ${pct}% em relação a ${prevLabel}, puxadas por ${top.name} (${brl(top.expenseCents)}).`;
  return `Saídas caíram ${-pct}% em relação a ${prevLabel}.`;
}

// One or two sentences about the month, every branch covered by tests.
export function buildInsight(current: MonthSummary, previous: MonthSummary | null): string {
  if (current.expenseCents === 0) return `Nenhuma saída registrada em ${monthLabel(current.month)}.`;

  const top = current.byCategory[0];
  const prev = previous && previous.expenseCents > 0 ? previous : null;
  const sentences: string[] = [];

  if (current.byCategory.length === 1) {
    sentences.push(`Tudo foi em ${top.name} (${brl(top.expenseCents)}).`);
  } else if (!prev) {
    sentences.push(
      `Você gastou ${brl(current.expenseCents)} em ${monthLabel(current.month)}, mais em ${top.name} (${brl(top.expenseCents)}).`,
    );
  } else {
    sentences.push(trend(current, prev, top));
  }

  const over = current.byCategory.filter((c) => c.budgetCents !== null && c.expenseCents > c.budgetCents);
  if (over.length === 1) sentences.push(`${over[0].name} estourou o orçamento.`);
  if (over.length >= 2) sentences.push(`${joinPt(over.map((c) => c.name))} estouraram o orçamento.`);

  return sentences.join(" ");
}
