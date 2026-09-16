"use client";

import { useEffect, type ReactNode } from "react";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

// The one editing surface of the app: create and edit always happen here, on
// the right, while the page underneath stays put.
export function SidePanel({ open, onClose, title, children, footer }: SidePanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div aria-hidden={!open} className={"fixed inset-0 z-40 " + (open ? "" : "pointer-events-none")}>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className={
          "absolute inset-0 bg-[#111110]/15 transition-opacity duration-200 " + (open ? "opacity-100" : "opacity-0")
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={
          "absolute right-0 top-0 h-full w-[420px] max-w-full flex flex-col bg-surface border-l border-border shadow-[-12px_0_40px_rgba(17,17,16,0.08)] transition-transform duration-200 ease-out " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="h-8 w-8 shrink-0 rounded-lg text-muted hover:bg-background hover:text-foreground"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <footer className="border-t border-border px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}
