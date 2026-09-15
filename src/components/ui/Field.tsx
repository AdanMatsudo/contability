import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, children, className }: FieldProps) {
  return (
    <label className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
      {error && <span className="text-xs text-[#a14d13]">{error}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-foreground";
