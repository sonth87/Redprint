import { describe, expect, it } from "vitest";
import {
  evaluateTargeting,
  evaluateSchedule,
  evaluateFrequency,
  resolveLocaleContent,
} from "../../src/popups/rules";
import type { PopupDefinition } from "../../src/document/popups";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePopup(overrides: Partial<PopupDefinition> = {}): PopupDefinition {
  return {
    id: "p1",
    name: "Test",
    kind: "modal",
    rootNodeId: "root",
    enabled: true,
    rules: {},
    behavior: { closeOnOutsideClick: true, closeOnEsc: true, preventBodyScroll: true },
    animation: { in: "fade", out: "fade" },
    kindConfig: {},
    goals: [],
    variants: [],
    metadata: { createdAt: "", updatedAt: "" },
    ...overrides,
  };
}

// ── evaluateSchedule ─────────────────────────────────────────────────────────

describe("evaluateSchedule", () => {
  it("returns true when schedule is absent", () => {
    expect(evaluateSchedule(undefined, Date.now())).toBe(true);
  });

  it("returns true when schedule.enabled is false", () => {
    expect(evaluateSchedule({ enabled: false, startDate: "2000-01-01" }, Date.now())).toBe(true);
  });

  it("returns false before startDate", () => {
    const future = new Date("2099-01-01").toISOString();
    expect(evaluateSchedule({ enabled: true, startDate: future }, Date.now())).toBe(false);
  });

  it("returns true after startDate", () => {
    const past = new Date("2000-01-01").toISOString();
    expect(evaluateSchedule({ enabled: true, startDate: past }, Date.now())).toBe(true);
  });

  it("returns false after endDate", () => {
    const past = new Date("2000-01-01").toISOString();
    expect(evaluateSchedule({ enabled: true, endDate: past }, Date.now())).toBe(false);
  });

  it("returns true between startDate and endDate", () => {
    const start = new Date("2000-01-01").toISOString();
    const end = new Date("2099-01-01").toISOString();
    expect(evaluateSchedule({ enabled: true, startDate: start, endDate: end }, Date.now())).toBe(true);
  });

  it("timeWindow: returns false outside hours", () => {
    // Use a fixed timestamp: 2024-06-15 03:00 UTC (hour = 3)
    const now = new Date("2024-06-15T03:00:00Z").getTime();
    expect(evaluateSchedule({ enabled: true, timeWindow: { startHour: 9, endHour: 17 } }, now)).toBe(false);
  });

  it("timeWindow: returns true within hours", () => {
    const now = new Date("2024-06-15T12:00:00Z").getTime();
    expect(evaluateSchedule({ enabled: true, timeWindow: { startHour: 9, endHour: 17 } }, now)).toBe(true);
  });

  it("timeWindow: returns false on excluded day of week", () => {
    // 2024-06-15 is Saturday (6); exclude Saturday
    const now = new Date("2024-06-15T12:00:00Z").getTime();
    expect(evaluateSchedule({ enabled: true, timeWindow: { startHour: 0, endHour: 23, daysOfWeek: [1, 2, 3, 4, 5] } }, now)).toBe(false);
  });

  it("timeWindow: returns true on included day of week", () => {
    // 2024-06-17 is Monday (1)
    const now = new Date("2024-06-17T12:00:00Z").getTime();
    expect(evaluateSchedule({ enabled: true, timeWindow: { startHour: 0, endHour: 23, daysOfWeek: [1, 2, 3, 4, 5] } }, now)).toBe(true);
  });
});

// ── evaluateTargeting ─────────────────────────────────────────────────────────

describe("evaluateTargeting", () => {
  it("returns true when targeting is absent", () => {
    expect(evaluateTargeting(undefined, {})).toBe(true);
  });

  it("returns true when targeting.enabled is false", () => {
    expect(evaluateTargeting({ enabled: false, groups: [{ match: "all", conditions: [{ variable: "x", operator: "eq", value: "y" }] }] }, { x: "z" })).toBe(true);
  });

  it("returns true when groups are empty", () => {
    expect(evaluateTargeting({ enabled: true, groups: [] }, {})).toBe(true);
  });

  it("all-match group: passes when all conditions hold", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "plan", operator: "eq", value: "pro" }, { variable: "active", operator: "truthy" }] }] },
      { plan: "pro", active: true },
    )).toBe(true);
  });

  it("all-match group: fails when one condition fails", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "plan", operator: "eq", value: "pro" }, { variable: "active", operator: "truthy" }] }] },
      { plan: "pro", active: false },
    )).toBe(false);
  });

  it("any-match group: passes when at least one condition holds", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "any", conditions: [{ variable: "plan", operator: "eq", value: "pro" }, { variable: "plan", operator: "eq", value: "enterprise" }] }] },
      { plan: "enterprise" },
    )).toBe(true);
  });

  it("any-match group: fails when no condition holds", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "any", conditions: [{ variable: "plan", operator: "eq", value: "pro" }] }] },
      { plan: "free" },
    )).toBe(false);
  });

  it("multiple groups: AND across groups", () => {
    expect(evaluateTargeting(
      {
        enabled: true,
        groups: [
          { match: "all", conditions: [{ variable: "plan", operator: "eq", value: "pro" }] },
          { match: "all", conditions: [{ variable: "country", operator: "eq", value: "US" }] },
        ],
      },
      { plan: "pro", country: "CA" },
    )).toBe(false);
  });

  it("operator 'in': passes when value is in array", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "plan", operator: "in", value: ["pro", "enterprise"] }] }] },
      { plan: "pro" },
    )).toBe(true);
  });

  it("operator 'notIn': passes when value is not in array", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "plan", operator: "notIn", value: ["pro", "enterprise"] }] }] },
      { plan: "free" },
    )).toBe(true);
  });

  it("operator 'matches': passes when value matches regex", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "url", operator: "matches", value: "^/blog/" }] }] },
      { url: "/blog/hello" },
    )).toBe(true);
  });

  it("operator 'matches': fails when value does not match regex", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "url", operator: "matches", value: "^/blog/" }] }] },
      { url: "/shop" },
    )).toBe(false);
  });

  it("dot-notation variable resolution", () => {
    expect(evaluateTargeting(
      { enabled: true, groups: [{ match: "all", conditions: [{ variable: "user.trait.plan", operator: "eq", value: "pro" }] }] },
      { user: { trait: { plan: "pro" } } },
    )).toBe(true);
  });
});

// ── evaluateFrequency ─────────────────────────────────────────────────────────

describe("evaluateFrequency", () => {
  const noCount = () => undefined;

  it("returns true when frequency is absent and no legacy rules", () => {
    expect(evaluateFrequency(undefined, {}, noCount, "p1", "d1", Date.now())).toBe(true);
  });

  it("returns true when below cap", () => {
    const getCount = (key: string) => key.includes("session") ? { count: 0, storedAt: Date.now() } : undefined;
    expect(evaluateFrequency({ cap: { maxShows: 3, per: "session" } }, {}, getCount, "p1", "d1", Date.now())).toBe(true);
  });

  it("returns false when at or above session cap", () => {
    const getCount = () => ({ count: 3, storedAt: Date.now() });
    expect(evaluateFrequency({ cap: { maxShows: 3, per: "session" } }, {}, getCount, "p1", "d1", Date.now())).toBe(false);
  });

  it("returns true when day cap window has expired", () => {
    const now = Date.now();
    const oldStoredAt = now - 25 * 60 * 60 * 1000; // 25 hours ago
    const getCount = () => ({ count: 5, storedAt: oldStoredAt });
    expect(evaluateFrequency({ cap: { maxShows: 3, per: "day" } }, {}, getCount, "p1", "d1", now)).toBe(true);
  });

  it("returns false when day cap active within window", () => {
    const now = Date.now();
    const getCount = () => ({ count: 3, storedAt: now - 1000 }); // 1 second ago
    expect(evaluateFrequency({ cap: { maxShows: 3, per: "day" } }, {}, getCount, "p1", "d1", now)).toBe(false);
  });

  it("suppressAfterGoalIds: returns false when goal was converted", () => {
    const getCount = (key: string) => key.includes("converted") ? { count: 1, storedAt: Date.now() } : undefined;
    expect(evaluateFrequency({ suppressAfterGoalIds: ["goal1"] }, {}, getCount, "p1", "d1", Date.now())).toBe(false);
  });

  it("legacy showOncePerSession: returns false when session key present", () => {
    const getCount = () => ({ count: 1, storedAt: Date.now() });
    expect(evaluateFrequency(undefined, { showOncePerSession: true }, getCount, "p1", "d1", Date.now())).toBe(false);
  });

  it("legacy maxShows: returns false when count >= maxShows", () => {
    const getCount = () => ({ count: 5, storedAt: Date.now() });
    expect(evaluateFrequency(undefined, { maxShows: 5 }, getCount, "p1", "d1", Date.now())).toBe(false);
  });

  it("legacy showOnceEveryDays: allows after window expires", () => {
    const now = Date.now();
    const getCount = () => ({ count: 1, storedAt: now - 8 * 24 * 60 * 60 * 1000 }); // 8 days ago
    expect(evaluateFrequency(undefined, { showOnceEveryDays: 7 }, getCount, "p1", "d1", now)).toBe(true);
  });

  it("legacy showOnceEveryDays: blocks within window", () => {
    const now = Date.now();
    const getCount = () => ({ count: 1, storedAt: now - 3 * 24 * 60 * 60 * 1000 }); // 3 days ago
    expect(evaluateFrequency(undefined, { showOnceEveryDays: 7 }, getCount, "p1", "d1", now)).toBe(false);
  });
});

// ── resolveLocaleContent ──────────────────────────────────────────────────────

describe("resolveLocaleContent", () => {
  it("returns base rootNodeId when no locales defined", () => {
    const popup = makePopup({ rootNodeId: "base-root" });
    const result = resolveLocaleContent(popup, "fr");
    expect(result.rootNodeId).toBe("base-root");
    expect(result.resolvedLocale).toBeNull();
  });

  it("exact locale match", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      locales: [{ locale: "fr", rootNodeId: "fr-root" }],
    });
    const result = resolveLocaleContent(popup, "fr");
    expect(result.rootNodeId).toBe("fr-root");
    expect(result.resolvedLocale).toBe("fr");
  });

  it("language-prefix match: 'fr' matches 'fr-CA' request", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      locales: [{ locale: "fr", rootNodeId: "fr-root" }],
    });
    const result = resolveLocaleContent(popup, "fr-CA");
    expect(result.rootNodeId).toBe("fr-root");
    expect(result.resolvedLocale).toBe("fr");
  });

  it("exact match wins over prefix match", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      locales: [
        { locale: "fr", rootNodeId: "fr-root" },
        { locale: "fr-CA", rootNodeId: "fr-ca-root" },
      ],
    });
    const result = resolveLocaleContent(popup, "fr-CA");
    expect(result.rootNodeId).toBe("fr-ca-root");
    expect(result.resolvedLocale).toBe("fr-CA");
  });

  it("falls back to fallbackLocale when no match", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      fallbackLocale: "en",
      locales: [
        { locale: "en", rootNodeId: "en-root" },
        { locale: "fr", rootNodeId: "fr-root" },
      ],
    });
    const result = resolveLocaleContent(popup, "ja");
    expect(result.rootNodeId).toBe("en-root");
    expect(result.resolvedLocale).toBe("en");
  });

  it("falls back to base when fallbackLocale not in locales", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      fallbackLocale: "de",
      locales: [{ locale: "fr", rootNodeId: "fr-root" }],
    });
    const result = resolveLocaleContent(popup, "ja");
    expect(result.rootNodeId).toBe("base-root");
    expect(result.resolvedLocale).toBeNull();
  });

  it("returns base when locale is null", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      locales: [{ locale: "fr", rootNodeId: "fr-root" }],
    });
    const result = resolveLocaleContent(popup, null);
    expect(result.rootNodeId).toBe("base-root");
    expect(result.resolvedLocale).toBeNull();
  });

  it("patch-only locale (no rootNodeId) returns base rootNodeId with patch", () => {
    const popup = makePopup({
      rootNodeId: "base-root",
      locales: [{ locale: "fr", popupPatch: { name: "Promo FR" } }],
    });
    const result = resolveLocaleContent(popup, "fr");
    expect(result.rootNodeId).toBe("base-root");
    expect(result.patch?.name).toBe("Promo FR");
    expect(result.resolvedLocale).toBe("fr");
  });
});
