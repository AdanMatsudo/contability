import type { Category, Transaction } from "@/domain/types";
import { addMonths, daysInMonth, type IsoDate, type YearMonth } from "@/lib/dates";

export const UNCATEGORIZED_NAME = "Sem categoria";
export const UNCATEGORIZED_COLOR = "#c9c8c2";
export const OTHERS_NAME = "Outros";
export const OTHERS_COLOR = "#c9c8c2";
const TOP_BLOCKS = 5;

export interface DayPoint {
  date: IsoDate;
  incomeCents: number;
  expenseCents: number;
  cumulativeCents: number;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  expenseCents: number;
  budgetCents: number | null;
}

export interface MonthSummary {
  month: YearMonth;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  days: DayPoint[];
  byCategory: CategorySlice[];
  topCategories: CategorySlice[];
}

export interface MonthTotals {
  month: YearMonth;
  incomeCents: number;
  expenseCents: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Transfers (card bill payments) move money between accounts and count as neither.
export function summarize(transactions: Transaction[], categories: Category[], month: YearMonth): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const counted = transactions.filter((t) => {
    if (!t.date.startsWith(month)) return false;
    const category = t.categoryId ? byId.get(t.categoryId) : undefined;
    return category?.kind !== "TRANSFER";
  });

  let incomeCents = 0;
  let expenseCents = 0;
  const perDay = new Map<IsoDate, { incomeCents: number; expenseCents: number }>();
  const perCategory = new Map<string | null, number>();

  for (const t of counted) {
    const day = perDay.get(t.date) ?? { incomeCents: 0, expenseCents: 0 };
    if (t.amountCents >= 0) {
      incomeCents += t.amountCents;
      day.incomeCents += t.amountCents;
    } else {
      const out = -t.amountCents;
      expenseCents += out;
      day.expenseCents += out;
      perCategory.set(t.categoryId, (perCategory.get(t.categoryId) ?? 0) + out);
    }
    perDay.set(t.date, day);
  }

  const days: DayPoint[] = [];
  let cumulative = 0;
  for (let d = 1; d <= daysInMonth(month); d++) {
    const date = `${month}-${pad2(d)}`;
    const day = perDay.get(date) ?? { incomeCents: 0, expenseCents: 0 };
    cumulative += day.incomeCents - day.expenseCents;
    days.push({ date, ...day, cumulativeCents: cumulative });
  }

  const byCategory: CategorySlice[] = Array.from(perCategory.entries())
    .map(([categoryId, cents]) => {
      const category = categoryId ? byId.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? UNCATEGORIZED_NAME,
        color: category?.color ?? UNCATEGORIZED_COLOR,
        expenseCents: cents,
        budgetCents: category?.budgetCents ?? null,
      };
    })
    .sort((a, b) => b.expenseCents - a.expenseCents || a.name.localeCompare(b.name, "pt-BR"));

  return {
    month,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    days,
    byCategory,
    topCategories: topBlocks(byCategory),
  };
}

// Up to five blocks. With exactly five categories the last keeps its own name;
// from six on, the tail folds into "Outros".
function topBlocks(slices: CategorySlice[]): CategorySlice[] {
  if (slices.length <= TOP_BLOCKS) return slices;
  const head = slices.slice(0, TOP_BLOCKS - 1);
  const rest = slices.slice(TOP_BLOCKS - 1);
  return [
    ...head,
    {
      categoryId: null,
      name: OTHERS_NAME,
      color: OTHERS_COLOR,
      expenseCents: rest.reduce((sum, s) => sum + s.expenseCents, 0),
      budgetCents: null,
    },
  ];
}

export function history6(totals: MonthTotals[], month: YearMonth): MonthTotals[] {
  const byMonth = new Map(totals.map((t) => [t.month, t]));
  const out: MonthTotals[] = [];
  for (let i = 5; i >= 0; i--) {
    const ym = addMonths(month, -i);
    out.push(byMonth.get(ym) ?? { month: ym, incomeCents: 0, expenseCents: 0 });
  }
  return out;
}
