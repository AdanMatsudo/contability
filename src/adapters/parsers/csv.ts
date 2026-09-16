import Papa from "papaparse";

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

// Banks export UTF-8 (sometimes with a BOM) or windows-1252. Strict UTF-8
// decoding tells them apart: invalid bytes mean the legacy encoding.
export function decodeStatement(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}

export function parseCsvTable(text: string): CsvTable {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
    delimiter: "",
  });
  const [first, ...rest] = result.data;
  if (!first) return { headers: [], rows: [] };
  return {
    headers: first.map((h) => h.trim()),
    rows: rest.map((r) => r.map((c) => (c ?? "").trim())),
  };
}

// Header comparison ignores case, accents and stray spaces.
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
