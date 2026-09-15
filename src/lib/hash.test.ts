import { describe, expect, it } from "vitest";
import { computeImportHash } from "./hash";

const base = {
  accountId: "acc_1",
  date: "2026-09-13",
  amountCents: -3240,
  normalized: "PADARIA SAO JOSE",
  ordinal: 0,
};

describe("computeImportHash", () => {
  it("is deterministic", () => {
    expect(computeImportHash(base)).toBe(computeImportHash({ ...base }));
  });

  it("is a 40-char hex sha1", () => {
    expect(computeImportHash(base)).toMatch(/^[0-9a-f]{40}$/);
  });

  it("changes when any field changes", () => {
    const h = computeImportHash(base);
    expect(computeImportHash({ ...base, accountId: "acc_2" })).not.toBe(h);
    expect(computeImportHash({ ...base, date: "2026-09-14" })).not.toBe(h);
    expect(computeImportHash({ ...base, amountCents: -3241 })).not.toBe(h);
    expect(computeImportHash({ ...base, normalized: "PADARIA SAO JOSE X" })).not.toBe(h);
  });

  it("separates identical rows of the same file by ordinal", () => {
    expect(computeImportHash({ ...base, ordinal: 1 })).not.toBe(computeImportHash(base));
  });

  it("does not collide when fields shift across the separator", () => {
    const a = computeImportHash({ ...base, accountId: "a|b", date: "c" });
    const b = computeImportHash({ ...base, accountId: "a", date: "b|c" });
    expect(a).not.toBe(b);
  });
});
