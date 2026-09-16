export function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Matching key for rules and recurring templates: letters only, single-spaced.
// Digits and punctuation vary per statement line; the merchant words do not.
export function normalize(input: string): string {
  return stripAccents(input)
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
}

// Case- and accent-insensitive fold that keeps one output char per input char,
// so an index found in the folded string points at the same place in the original.
export function fold(input: string): string {
  return Array.from(input, (ch) => stripAccents(ch).toLowerCase()).join("");
}

export function matchRange(text: string, q: string): [number, number] | null {
  const needle = fold(q.trim());
  if (!needle) return null;
  const start = fold(text).indexOf(needle);
  return start === -1 ? null : [start, start + needle.length];
}
