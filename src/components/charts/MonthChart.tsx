"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money";
import type { DayPoint } from "@/services/month/month.service";
import { linearScale, niceCeiling, ticks } from "./scale";

const W = 1000;
const H = 260;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PAD_RIGHT = 84;

interface MonthChartProps {
  days: DayPoint[];
}

// Daily income and expense bars with the running balance as a line, all on
// one axis so the eye compares magnitudes directly. Numbers come in ready.
export function MonthChart({ days }: MonthChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const maxBar = Math.max(0, ...days.map((d) => Math.max(d.incomeCents, d.expenseCents)));
  const maxCum = Math.max(0, ...days.map((d) => d.cumulativeCents));
  const minCum = Math.min(0, ...days.map((d) => d.cumulativeCents));
  const top = niceCeiling(Math.max(maxBar, maxCum));
  const bottom = minCum < 0 ? -niceCeiling(-minCum) : 0;
  const y = linearScale([bottom, top], [H - PAD_BOTTOM, PAD_TOP]);
  const plotW = W - PAD_RIGHT;
  const slot = plotW / Math.max(1, days.length);
  const barW = Math.max(3, slot * 0.28);
  const x = (i: number) => i * slot + slot / 2;
  const zero = y(0);

  const line = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.cumulativeCents).toFixed(1)}`).join(" ");
  const axis = [...new Set([...ticks(top, 4), ...(bottom < 0 ? ticks(bottom, 2) : [])])];
  const active = hover === null ? null : days[hover];

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    if (px > plotW) return setHover(null);
    setHover(Math.min(days.length - 1, Math.max(0, Math.floor(px / slot))));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Entradas e saídas por dia com saldo acumulado"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {axis.map((v) => (
          <g key={v}>
            <line x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke="#e6e5e1" strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={plotW + 10} y={y(v) + 4} fontSize={12} fill="#9a998f">
              {compact(v)}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={d.date} opacity={hover === null || hover === i ? 1 : 0.45} className="transition-opacity">
            {d.incomeCents > 0 && (
              <rect x={x(i) - barW - 1} y={y(d.incomeCents)} width={barW} height={zero - y(d.incomeCents)} rx={2} fill="#1baf7a" />
            )}
            {d.expenseCents > 0 && (
              <rect x={x(i) + 1} y={y(d.expenseCents)} width={barW} height={zero - y(d.expenseCents)} rx={2} fill="#eb6834" />
            )}
          </g>
        ))}
        <path d={line} fill="none" stroke="#111110" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke="#111110" strokeDasharray="3 4" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(active.cumulativeCents)} r={4.5} fill="#111110" stroke="#fff" strokeWidth={2} />
          </>
        )}
        {days.map((d, i) =>
          (i === 0 || (i + 1) % 5 === 0) && i !== days.length - 1 ? (
            <text key={d.date} x={x(i)} y={H - 8} fontSize={12} fill="#9a998f" textAnchor="middle">
              {Number(d.date.slice(8))}
            </text>
          ) : null,
        )}
        <text x={x(days.length - 1)} y={H - 8} fontSize={12} fill="#9a998f" textAnchor="middle">
          {days.length}
        </text>
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full rounded-xl bg-foreground px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="font-medium">dia {Number(active.date.slice(8))}</div>
          {active.incomeCents > 0 && <div className="text-[#7fe0bb]">+ {formatBRL(active.incomeCents)}</div>}
          {active.expenseCents > 0 && <div className="text-[#ffb391]">− {formatBRL(active.expenseCents)}</div>}
          <div className="opacity-80">saldo {formatBRL(active.cumulativeCents)}</div>
        </div>
      )}
    </div>
  );
}

function compact(cents: number): string {
  const reais = cents / 100;
  const abs = Math.abs(reais);
  const sign = reais < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `${sign}${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
