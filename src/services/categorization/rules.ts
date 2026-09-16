import { normalize } from "@/lib/text";
import type { Rule } from "@/domain/types";

// "Contains" on the normalized text. The most specific (longest) pattern wins;
// on a tie, the one that has been right more often.
export function matchRule(normalized: string, rules: Rule[]): Rule | null {
  if (!normalized) return null;
  const candidates = rules.filter((r) => r.pattern && normalized.includes(r.pattern));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.pattern.length - a.pattern.length || b.hits - a.hits);
  return candidates[0];
}

const MIN_PATTERN = 3;
// Words the card adds around the merchant name; they never identify anything.
const NOISE = new Set(["PARCELA"]);

// Strip installment noise and single letters ("OAK I F I O VAULT I PARCELA").
// Falls back to the input when nothing meaningful would be left.
function tidy(pattern: string): string {
  const kept = pattern.split(" ").filter((w) => w.length > 1 && !NOISE.has(w));
  return kept.length > 0 ? kept.join(" ") : pattern;
}

// Card statements write "Processor*Merchant" (Ifd*, Zig*, Pac*): the part before
// the * names a family, so that is the pattern worth learning. Without a * the
// whole normalized text is the best we have.
export function suggestPattern(description: string): string {
  const star = description.indexOf("*");
  if (star !== -1) {
    const before = normalize(description.slice(0, star));
    if (before.length >= MIN_PATTERN) return tidy(before);
  }
  return tidy(normalize(description));
}
