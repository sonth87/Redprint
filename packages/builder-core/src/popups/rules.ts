import type {
  PopupDefinition,
  PopupFrequencyConfig,
  PopupLocaleContent,
  PopupRules,
  PopupSchedule,
  PopupTargeting,
  PopupTargetingCondition,
} from "../document/popups";

// ── Targeting ──────────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evaluateCondition(
  cond: PopupTargetingCondition,
  context: Record<string, unknown>,
): boolean {
  const value = getNestedValue(context, cond.variable);
  switch (cond.operator) {
    case "eq":
      return value === cond.value;
    case "neq":
      return value !== cond.value;
    case "gt":
      return (value as number) > (cond.value as number);
    case "lt":
      return (value as number) < (cond.value as number);
    case "gte":
      return (value as number) >= (cond.value as number);
    case "lte":
      return (value as number) <= (cond.value as number);
    case "contains":
      return String(value).includes(String(cond.value));
    case "truthy":
      return !!value;
    case "falsy":
      return !value;
    case "in":
      return Array.isArray(cond.value) && (cond.value as unknown[]).includes(value);
    case "notIn":
      return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(value);
    case "matches": {
      try {
        return new RegExp(String(cond.value)).test(String(value));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/**
 * Evaluate all targeting groups (AND across groups; match mode within each group).
 * Returns true when targeting is absent, disabled, or all groups pass.
 */
export function evaluateTargeting(
  targeting: PopupTargeting | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!targeting?.enabled || !targeting.groups?.length) return true;
  return targeting.groups.every((group) => {
    const conditions = group.conditions ?? [];
    if (conditions.length === 0) return true;
    if (group.match === "any") {
      return conditions.some((c) => evaluateCondition(c, context));
    }
    return conditions.every((c) => evaluateCondition(c, context));
  });
}

// ── Scheduling ─────────────────────────────────────────────────────────────────

/**
 * Resolve an IANA timezone offset in minutes relative to UTC for a given timestamp.
 * Falls back to 0 (UTC) if timezone is absent or Intl is unavailable.
 */
function tzOffsetMinutes(timezone: string | undefined, now: number): number {
  if (!timezone) return 0;
  try {
    // Use Intl to determine the local time in the given tz, then compute offset.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(now));
    const tzHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const tzMin = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const utcDate = new Date(now);
    const utcHour = utcDate.getUTCHours();
    const utcMin = utcDate.getUTCMinutes();
    return (tzHour * 60 + tzMin) - (utcHour * 60 + utcMin);
  } catch {
    return 0;
  }
}

/**
 * Check if the popup is within its scheduled window.
 * Returns true when schedule is absent, disabled, or current time is in range.
 * @param now — current time as ms timestamp (passed in for testability)
 */
export function evaluateSchedule(
  schedule: PopupSchedule | undefined,
  now: number,
): boolean {
  if (!schedule?.enabled) return true;

  const offsetMs = tzOffsetMinutes(schedule.timezone, now) * 60 * 1000;
  const local = new Date(now + offsetMs);

  if (schedule.startDate) {
    const start = new Date(schedule.startDate).getTime();
    if (now < start) return false;
  }
  if (schedule.endDate) {
    const end = new Date(schedule.endDate).getTime();
    if (now > end) return false;
  }

  if (schedule.timeWindow) {
    const { startHour, endHour, daysOfWeek } = schedule.timeWindow;
    const hour = local.getUTCHours();
    const dow = local.getUTCDay();
    if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(dow)) return false;
    if (hour < startHour || hour > endHour) return false;
  }

  return true;
}

// ── Frequency ──────────────────────────────────────────────────────────────────

const MS_DAY = 24 * 60 * 60 * 1000;
const MS: Record<string, number> = {
  hour: 60 * 60 * 1000,
  day: MS_DAY,
  week: 7 * MS_DAY,
  month: 30 * MS_DAY,
};

function freqKey(
  popupId: string,
  docId: string,
  per: string,
  prefix: string | undefined,
): string {
  const base = prefix ?? `ui-builder:popup:${docId}:${popupId}:freq`;
  return `${base}:${per}`;
}

function goalConvertedKey(docId: string, goalId: string): string {
  return `ui-builder:goal:${docId}:${goalId}:converted`;
}

/**
 * Check frequency cap. Returns true = allowed to show.
 * Reads both the new `frequency` struct and legacy fields (frequency struct takes precedence).
 * @param getCount — reads a stored count; receives the storage key, returns the stored value or undefined.
 * @param now — current ms timestamp
 */
export function evaluateFrequency(
  frequency: PopupFrequencyConfig | undefined,
  legacyRules: Pick<PopupRules, "showOncePerSession" | "showOnceEveryDays" | "maxShows">,
  getCount: (key: string) => { count: number; storedAt: number } | undefined,
  popupId: string,
  docId: string,
  now: number,
): boolean {
  if (frequency) {
    // suppressAfterGoalIds: check if any listed goal was already converted
    if (frequency.suppressAfterGoalIds?.length) {
      for (const goalId of frequency.suppressAfterGoalIds) {
        const key = goalConvertedKey(docId, goalId);
        if (getCount(key) !== undefined) return false;
      }
    }

    if (frequency.cap) {
      const { maxShows, per } = frequency.cap;
      if (per === "session") {
        const key = freqKey(popupId, docId, "session", frequency.storageKeyPrefix);
        const stored = getCount(key);
        if (stored && stored.count >= maxShows) return false;
      } else {
        const windowMs = MS[per] ?? MS_DAY;
        const key = freqKey(popupId, docId, per, frequency.storageKeyPrefix);
        const stored = getCount(key);
        if (stored) {
          const elapsed = now - stored.storedAt;
          if (elapsed < windowMs && stored.count >= maxShows) return false;
        }
      }
    }
    return true;
  }

  // Legacy field fallback
  if (legacyRules.showOncePerSession) {
    const key = freqKey(popupId, docId, "session", undefined);
    if (getCount(key) !== undefined) return false;
  }
  if (legacyRules.maxShows !== undefined) {
    const key = freqKey(popupId, docId, "total", undefined);
    const stored = getCount(key);
    if (stored && stored.count >= legacyRules.maxShows) return false;
  }
  if (legacyRules.showOnceEveryDays !== undefined) {
    const key = freqKey(popupId, docId, "day", undefined);
    const stored = getCount(key);
    if (stored) {
      const windowMs = legacyRules.showOnceEveryDays * MS_DAY;
      if (now - stored.storedAt < windowMs) return false;
    }
  }
  return true;
}

/**
 * Produce the storage key + new count to persist after a popup impression.
 * The caller is responsible for actually writing to storage.
 */
export function recordFrequencyImpression(
  popupId: string,
  docId: string,
  frequency: PopupFrequencyConfig | undefined,
  now: number,
): { key: string; per: string } {
  const per = frequency?.cap?.per ?? "total";
  const key = freqKey(popupId, docId, per, frequency?.storageKeyPrefix);
  return { key, per };
}

// ── Localization ───────────────────────────────────────────────────────────────

/**
 * Resolve locale content for a popup.
 * Matching order: exact match → language-only prefix match → fallbackLocale → base.
 * Returns the rootNodeId (base or locale-owned) and the locale's popupPatch (or undefined).
 */
export function resolveLocaleContent(
  popup: PopupDefinition,
  locale: string | null | undefined,
): { rootNodeId: string; patch: PopupLocaleContent["popupPatch"] | undefined; resolvedLocale: string | null } {
  const base = { rootNodeId: popup.rootNodeId, patch: undefined, resolvedLocale: null };
  if (!locale || !popup.locales?.length) return base;

  // 1. Exact match
  let match = popup.locales.find((l) => l.locale === locale);
  if (match) return { rootNodeId: match.rootNodeId ?? popup.rootNodeId, patch: match.popupPatch, resolvedLocale: match.locale };

  // 2. Language-only prefix: "fr" matches request "fr-CA"
  const lang = locale.split("-")[0];
  if (lang) {
    match = popup.locales.find((l) => l.locale === lang || l.locale.startsWith(lang + "-"));
    if (match) return { rootNodeId: match.rootNodeId ?? popup.rootNodeId, patch: match.popupPatch, resolvedLocale: match.locale };
  }

  // 3. Fallback locale
  if (popup.fallbackLocale) {
    match = popup.locales.find((l) => l.locale === popup.fallbackLocale);
    if (match) return { rootNodeId: match.rootNodeId ?? popup.rootNodeId, patch: match.popupPatch, resolvedLocale: match.locale };
  }

  return base;
}
