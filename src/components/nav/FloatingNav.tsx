"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Mês",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "Lançamentos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    href: "/import",
    label: "Importar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
      </svg>
    ),
  },
  {
    href: "/categories",
    label: "Categorias",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M20 12l-8 8-9-9V3h8z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </svg>
    ),
  },
  {
    href: "/recurring",
    label: "Recorrentes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M17 2l4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3" />
      </svg>
    ),
  },
];

export function FloatingNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="absolute left-1/2 top-[14px] -translate-x-1/2 flex gap-1 p-1.5 bg-surface rounded-[14px] shadow-[0_1px_2px_rgba(17,17,16,0.06),0_8px_24px_rgba(17,17,16,0.06)]"
    >
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            aria-current={active ? "page" : undefined}
            className={
              "w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors " +
              (active ? "bg-foreground text-white" : "text-muted hover:bg-background")
            }
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
