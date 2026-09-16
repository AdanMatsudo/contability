import Link from "next/link";
import { addMonths, monthLabel, type YearMonth } from "@/lib/dates";

interface MonthNavProps {
  month: YearMonth;
  current: YearMonth;
  basePath: string;
}

// Arrows step one month; the label links back to the current month when away.
export function MonthNav({ month, current, basePath }: MonthNavProps) {
  const href = (ym: YearMonth) => (ym === current ? basePath : `${basePath}?month=${ym}`);
  const arrow = "w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-foreground";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addMonths(month, -1))} aria-label="Mês anterior" className={arrow}>
        ‹
      </Link>
      <Link
        href={href(current)}
        className="min-w-[180px] text-center text-sm font-medium capitalize hover:text-foreground"
        title={month === current ? "" : "Voltar pro mês atual"}
      >
        {monthLabel(month, true)}
      </Link>
      <Link href={href(addMonths(month, 1))} aria-label="Mês seguinte" className={arrow}>
        ›
      </Link>
    </div>
  );
}
