import { linearScale } from "./scale";

interface SparklineProps {
  values: number[];
  color: string;
}

const W = 240;
const H = 56;

// A single line, no axes: the shape is the message.
export function Sparkline({ values, color }: SparklineProps) {
  if (values.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14 block" />;
  const max = Math.max(1, ...values);
  const x = linearScale([0, values.length - 1], [2, W - 2]);
  const y = linearScale([0, max], [H - 2, 2]);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${d} L${x(values.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14 block" role="img" aria-label="Saídas acumuladas no mês">
      <path d={area} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
