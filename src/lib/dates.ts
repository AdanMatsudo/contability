// Domain dates are plain strings: IsoDate "YYYY-MM-DD", YearMonth "YYYY-MM".
// Only repositories convert to JS Date. "Today" follows the Sao Paulo calendar.
export type IsoDate = string;
export type YearMonth = string;

export const SAO_PAULO = "America/Sao_Paulo";

const pad2 = (n: number) => String(n).padStart(2, "0");

function splitMonth(ym: YearMonth): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m];
}

export function daysInMonth(ym: YearMonth): number {
  const [y, m] = splitMonth(ym);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthRange(ym: YearMonth): { from: IsoDate; to: IsoDate } {
  return { from: `${ym}-01`, to: `${ym}-${pad2(daysInMonth(ym))}` };
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const [y, m] = splitMonth(ym);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

export function todayIso(now: Date = new Date(), timeZone: string = SAO_PAULO): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMonth(now: Date = new Date(), timeZone: string = SAO_PAULO): YearMonth {
  return monthOf(todayIso(now, timeZone));
}

export function monthOf(date: IsoDate): YearMonth {
  return date.slice(0, 7);
}

export function parseDmy(input: string): IsoDate | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  const valid =
    probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
  return valid ? `${y}-${pad2(m)}-${pad2(d)}` : null;
}

export function clampDay(ym: YearMonth, day: number): IsoDate {
  const clamped = Math.min(Math.max(1, day), daysInMonth(ym));
  return `${ym}-${pad2(clamped)}`;
}
