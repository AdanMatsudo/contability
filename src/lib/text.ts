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
