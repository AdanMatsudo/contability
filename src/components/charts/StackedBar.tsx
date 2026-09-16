import { formatBRL } from "@/lib/money";

export interface StackSlice {
  key: string;
  name: string;
  color: string;
  value: number;
}

interface StackedBarProps {
  slices: StackSlice[];
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
}

// One horizontal bar split by share, 2px gaps, legend underneath.
export function StackedBar({ slices, onSelect, selectedKey }: StackedBarProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <div className="h-3 rounded-full bg-background" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {slices.map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.name} · ${formatBRL(s.value)}`}
            aria-label={`${s.name}, ${formatBRL(s.value)}`}
            onClick={onSelect ? () => onSelect(s.key) : undefined}
            className={"h-full transition-opacity " + (selectedKey && selectedKey !== s.key ? "opacity-35" : "")}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: 4 }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className={selectedKey === s.key ? "text-foreground font-medium" : ""}>{s.name}</span>
            <span className="text-faint">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
