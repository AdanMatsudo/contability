"use client";

import { useState } from "react";

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
  // When set, the legend shows the value (e.g. R$) next to the share.
  formatValue?: (value: number) => string;
  emptyText?: string;
}

const share = (value: number, total: number) => Math.round((value / total) * 100);

// One horizontal bar split by share, with a legend in aligned columns. Hovering
// either side lights up the other and spells the slice out under the bar, so the
// bar never has to carry labels it has no room for.
export function StackedBar({ slices, onSelect, selectedKey, formatValue, emptyText }: StackedBarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3.5 rounded-full bg-background" />
        {emptyText && <p className="text-xs text-muted">{emptyText}</p>}
      </div>
    );
  }

  const active = hovered ?? selectedKey ?? null;
  const detail = slices.find((s) => s.key === active);
  const dim = (key: string) => (active && active !== key ? "opacity-35" : "");

  return (
    <div className="@container flex flex-col gap-2.5" onMouseLeave={() => setHovered(null)}>
      <div className="flex h-3.5 gap-[3px]">
        {slices.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-label={`${s.name}, ${formatValue ? formatValue(s.value) : `${share(s.value, total)}%`}`}
            onMouseEnter={() => setHovered(s.key)}
            onFocus={() => setHovered(s.key)}
            onClick={onSelect ? () => onSelect(s.key) : undefined}
            disabled={!onSelect}
            className={"h-full rounded-[3px] transition-opacity first:rounded-l-full last:rounded-r-full " + dim(s.key)}
            style={{ flexGrow: s.value, flexBasis: 0, minWidth: 6, background: s.color }}
          />
        ))}
      </div>

      {/* Fixed height so hovering never shifts what is below. */}
      <p className="h-4 text-xs text-muted truncate">
        {detail ? (
          <>
            <span className="text-foreground font-medium">{detail.name}</span>
            {formatValue && <> · <span className="tabular-nums">{formatValue(detail.value)}</span></>} ·{" "}
            {share(detail.value, total)}% do total
          </>
        ) : (
          ""
        )}
      </p>

      {/* Two columns once the card is wide enough for full names; one in the narrow Month card. */}
      <ul className="grid gap-x-8 gap-y-0.5 grid-cols-1 @md:grid-cols-2">
        {slices.map((s) => {
          const content = (
            <>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className={"min-w-0 flex-1 truncate " + (active === s.key ? "text-foreground font-medium" : "")}>{s.name}</span>
              {formatValue && <span className="shrink-0 tabular-nums text-foreground/80">{formatValue(s.value)}</span>}
              <span className="w-9 shrink-0 text-right tabular-nums text-faint">{share(s.value, total)}%</span>
            </>
          );
          return (
            <li key={s.key} className={"text-xs text-muted transition-opacity " + dim(s.key)}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(s.key)}
                  onMouseEnter={() => setHovered(s.key)}
                  onFocus={() => setHovered(s.key)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 -mx-1.5 py-1 text-left hover:bg-background"
                >
                  {content}
                </button>
              ) : (
                <span className="flex w-full items-center gap-2 px-1.5 -mx-1.5 py-1">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
