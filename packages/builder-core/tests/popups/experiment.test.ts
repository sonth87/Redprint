import { describe, expect, it } from "vitest";
import {
  normalizeWeights,
  pickVariant,
  resolveVariantAssignment,
  resolvePopupForVariant,
  seededRng,
} from "../../src/popups/experiment";
import type { PopupVariant, PopupDefinition } from "../../src/document/popups";

function variant(id: string, weight: number, enabled = true): PopupVariant {
  return { id, name: id, weight, enabled };
}

describe("normalizeWeights", () => {
  it("excludes disabled variants and zero/negative weights", () => {
    const table = normalizeWeights([
      variant("a", 1),
      variant("b", 0),
      variant("c", -5),
      variant("d", 3, false),
    ]);
    expect(table.map((e) => e.variantId)).toEqual(["a"]);
    expect(table[0].cumulative).toBe(1);
  });

  it("returns empty table when nothing is eligible", () => {
    expect(normalizeWeights([])).toEqual([]);
    expect(normalizeWeights([variant("a", 0)])).toEqual([]);
    expect(normalizeWeights([variant("a", 1, false)])).toEqual([]);
    expect(normalizeWeights(undefined)).toEqual([]);
  });

  it("produces a monotonically increasing cumulative table ending at 1", () => {
    const table = normalizeWeights([variant("a", 1), variant("b", 1), variant("c", 2)]);
    expect(table.map((e) => e.variantId)).toEqual(["a", "b", "c"]);
    expect(table[0].cumulative).toBeCloseTo(0.25);
    expect(table[1].cumulative).toBeCloseTo(0.5);
    expect(table[table.length - 1].cumulative).toBe(1);
  });
});

describe("pickVariant", () => {
  it("is deterministic with a seeded rng", () => {
    const variants = [variant("a", 1), variant("b", 1)];
    const rng1 = seededRng("seed-x");
    const rng2 = seededRng("seed-x");
    const seq1 = Array.from({ length: 5 }, () => pickVariant(variants, rng1));
    const seq2 = Array.from({ length: 5 }, () => pickVariant(variants, rng2));
    expect(seq1).toEqual(seq2);
  });

  it("returns null when no variant is eligible", () => {
    expect(pickVariant([], () => 0.5)).toBeNull();
    expect(pickVariant(undefined, () => 0.5)).toBeNull();
  });

  it("respects weights over a large sample", () => {
    const variants = [variant("a", 9), variant("b", 1)];
    let aCount = 0;
    const rng = seededRng("distribution");
    for (let i = 0; i < 2000; i++) {
      if (pickVariant(variants, rng) === "a") aCount++;
    }
    // ~90% expected; allow generous tolerance.
    expect(aCount / 2000).toBeGreaterThan(0.8);
    expect(aCount / 2000).toBeLessThan(0.98);
  });
});

describe("resolveVariantAssignment", () => {
  const variants = [variant("a", 1), variant("b", 1)];

  it("returns base when experiment is absent or disabled", () => {
    expect(resolveVariantAssignment({ variants }).variantId).toBeNull();
    expect(
      resolveVariantAssignment({ variants, experiment: { enabled: false, assignment: "random" } }).variantId,
    ).toBeNull();
  });

  it("forces the winner variant regardless of enabled state", () => {
    const result = resolveVariantAssignment({
      variants: [variant("a", 1), variant("b", 1, false)],
      experiment: { enabled: true, assignment: "random", winnerVariantId: "b" },
    });
    expect(result.variantId).toBe("b");
    expect(result.isNew).toBe(false);
  });

  it("reuses a valid sticky assignment", () => {
    const result = resolveVariantAssignment({
      variants,
      experiment: { enabled: true, assignment: "sticky" },
      existingAssignment: "a",
    });
    expect(result.variantId).toBe("a");
    expect(result.isNew).toBe(false);
  });

  it("reassigns when the sticky assignment is stale (deleted or disabled)", () => {
    const result = resolveVariantAssignment({
      variants,
      experiment: { enabled: true, assignment: "sticky" },
      existingAssignment: "gone",
      rng: () => 0,
    });
    expect(["a", "b"]).toContain(result.variantId);
    expect(result.isNew).toBe(true);
  });

  it("makes a fresh weighted pick for random assignment", () => {
    const result = resolveVariantAssignment({
      variants,
      experiment: { enabled: true, assignment: "random" },
      rng: () => 0,
    });
    expect(result.variantId).toBe("a");
    expect(result.isNew).toBe(true);
  });
});

describe("resolvePopupForVariant", () => {
  const base = {
    id: "p1",
    rootNodeId: "base-root",
    name: "Base",
    variants: [
      { id: "a", name: "A", weight: 1, enabled: true, rootNodeId: "a-root" },
      { id: "b", name: "B", weight: 1, enabled: true, popupPatch: { name: "Patched" } },
    ],
  } as unknown as PopupDefinition;

  it("returns base content when variantId is null", () => {
    const resolved = resolvePopupForVariant(base, null);
    expect(resolved.rootNodeId).toBe("base-root");
    expect(resolved.popup).toBe(base);
  });

  it("uses a variant's own content root", () => {
    expect(resolvePopupForVariant(base, "a").rootNodeId).toBe("a-root");
  });

  it("applies popupPatch and falls back to base root for patch-only variants", () => {
    const resolved = resolvePopupForVariant(base, "b");
    expect(resolved.rootNodeId).toBe("base-root");
    expect(resolved.popup.name).toBe("Patched");
  });

  it("falls back to base when the variant is missing", () => {
    expect(resolvePopupForVariant(base, "missing").rootNodeId).toBe("base-root");
  });
});
