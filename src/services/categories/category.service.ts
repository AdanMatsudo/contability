import { parseBrl } from "@/lib/money";
import { normalize } from "@/lib/text";

export const MAX_CATEGORY_NAME = 40;

// Categorical palette validated for color-vision deficiency (see design spec),
// followed by softer tones for the long tail of categories.
export const CATEGORY_PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#6f6e6a",
  "#9a998f",
];

export type NameValidation = { ok: true; name: string } | { ok: false; error: string };

export function validateCategoryName(
  input: string,
  existing: { id: string; name: string }[],
  selfId?: string,
): NameValidation {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Dê um nome à categoria." };
  if (name.length > MAX_CATEGORY_NAME) {
    return { ok: false, error: `Nome com até ${MAX_CATEGORY_NAME} caracteres.` };
  }
  const key = normalize(name);
  const clash = existing.find((c) => c.id !== selfId && normalize(c.name) === key);
  if (clash) return { ok: false, error: `Já existe a categoria "${clash.name}".` };
  return { ok: true, name };
}

export type BudgetValidation = { ok: true; budgetCents: number | null } | { ok: false; error: string };

export function parseBudget(input: string): BudgetValidation {
  if (!input.trim()) return { ok: true, budgetCents: null };
  const cents = parseBrl(input);
  if (cents === null) return { ok: false, error: "Valor inválido. Use 1.200,00." };
  if (cents <= 0) return { ok: false, error: "O orçamento precisa ser maior que zero." };
  return { ok: true, budgetCents: cents };
}

export function pickColor(usedColors: string[]): string {
  const counts = new Map(CATEGORY_PALETTE.map((c) => [c, 0]));
  usedColors.forEach((c) => {
    if (counts.has(c)) counts.set(c, (counts.get(c) as number) + 1);
  });
  let best = CATEGORY_PALETTE[0];
  for (const color of CATEGORY_PALETTE) {
    if ((counts.get(color) as number) < (counts.get(best) as number)) best = color;
  }
  return best;
}
