// Tiny numeric helpers for the SVG charts. No d3: the charts need one linear
// axis and a rounded ceiling, nothing more.

export function linearScale([d0, d1]: [number, number], [r0, r1]: [number, number]): (value: number) => number {
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  let exponent = Math.floor(Math.log10(value));
  if (10 ** (exponent + 1) <= value) exponent += 1;
  const base = 10 ** exponent;
  for (const step of NICE_STEPS) {
    const candidate = step * base;
    if (candidate >= value - 1e-9) return candidate;
  }
  return 10 * base;
}

export function ticks(ceiling: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (ceiling / count) * i);
}
