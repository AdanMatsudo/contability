"use client";

import { inputClass } from "./Field";

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  id?: string;
}

const format = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Types like a bank app: digits fill from the cents up ("3", "0,03" → "32,40").
// The value stays a pt-BR string the server parses with parseBrl.
export function maskBrl(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return format.format(Number(digits) / 100);
}

export function MoneyInput({ value, onChange, autoFocus, id }: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
      <input
        id={id}
        className={inputClass + " w-full pl-9 text-right text-lg font-semibold tabular-nums"}
        value={value}
        onChange={(e) => onChange(maskBrl(e.target.value))}
        inputMode="numeric"
        placeholder="0,00"
        autoFocus={autoFocus}
      />
    </div>
  );
}
