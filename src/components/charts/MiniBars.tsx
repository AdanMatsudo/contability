import type { MonthTotals } from "@/services/month/month.service";
import { linearScale, niceCeiling } from "./scale";

interface MiniBarsProps {
  months: MonthTotals[];
  current: string;
  metric: "incomeCents" | "expenseCents";
  color: string;
}

const W = 240;
const H = 56;

// Six months side by side; the current one is solid, the rest are faded.
export function MiniBars({ months, current, metric, color }: MiniBarsProps) {
  const top = niceCeiling(Math.max(0, ...months.map((m) => m[metric])));
  const y = linearScale([0, top], [H, 0]);
  const slot = W / months.length;
  const barW = slot * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14 block" role="img" aria-label="Últimos seis meses">
      {months.map((m, i) => {
        const h = Math.max(m[metric] > 0 ? 2 : 0, H - y(m[metric]));
        return (
          <rect
            key={m.month}
            x={i * slot + (slot - barW) / 2}
            y={H - h}
            width={barW}
            height={h}
            rx={3}
            fill={color}
            opacity={m.month === current ? 1 : 0.3}
          />
        );
      })}
    </svg>
  );
}
