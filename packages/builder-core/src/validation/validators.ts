import { z } from "zod";
import type { BuilderDocument } from "../document/types";

// ── Document Validator schemas ────────────────────────────────────────────

const NodeMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  pluginData: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const BuilderNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  parentId: z.string().nullable(),
  order: z.number().int(),
  props: z.record(z.unknown()),
  style: z.record(z.unknown()),
  responsiveStyle: z.record(z.record(z.unknown())),
  interactions: z.array(
    z.object({
      id: z.string(),
      trigger: z.string(),
      actions: z.array(z.object({ type: z.string() }).passthrough()),
    }).passthrough()
  ),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  name: z.string().optional(),
  slot: z.string().optional(),
  metadata: NodeMetadataSchema,
});

const PopupSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  rootNodeId: z.string(),
  kind: z.enum(["modal", "drawer", "bottomSheet", "bar", "fullscreen"]),
  placement: z.enum(["center", "top", "bottom", "left", "right"]),
  kindConfig: z.object({ kind: z.string() }).passthrough(),
  autoTrigger: z.object({ type: z.string() }).passthrough(),
  behavior: z.object({
    backdrop: z.object({
      enabled: z.boolean(),
      color: z.string(),
      opacity: z.number(),
      blur: z.string().optional(),
    }),
    closeOnEscape: z.boolean(),
    closeOnBackdropClick: z.boolean(),
    showCloseButton: z.boolean(),
    lockBodyScroll: z.boolean(),
    trapFocus: z.boolean(),
    restoreFocus: z.boolean(),
    // V3 — all optional so V2 documents validate unchanged
    closeOnRouteChange: z.boolean().optional(),
    closeOnOutsideInteraction: z.boolean().optional(),
    preventBackgroundInteraction: z.boolean().optional(),
    inertBackground: z.boolean().optional(),
    reducedMotion: z.enum(["respect", "ignore"]).optional(),
  }).passthrough(),
  animation: z.object({
    enter: z.string(),
    exit: z.string().optional(),
    durationMs: z.number(),
    easing: z.string().optional(),
  }).passthrough(),
  rules: z.object({
    devices: z.array(z.string()).optional(),
    showOncePerSession: z.boolean().optional(),
    showOnceEveryDays: z.number().optional(),
    maxShows: z.number().optional(),
    hideAfterSubmit: z.boolean().optional(),
    // V5
    frequency: z.object({
      cap: z.object({
        maxShows: z.number(),
        per: z.enum(["session", "hour", "day", "week", "month"]),
      }).optional(),
      suppressAfterGoalIds: z.array(z.string()).optional(),
      storageKeyPrefix: z.string().optional(),
    }).passthrough().optional(),
    targeting: z.object({
      enabled: z.boolean(),
      groups: z.array(z.object({
        match: z.enum(["all", "any"]),
        conditions: z.array(z.object({
          variable: z.string(),
          operator: z.enum(["eq","neq","gt","lt","gte","lte","contains","truthy","falsy","in","notIn","matches"]),
          value: z.unknown().optional(),
        }).passthrough()),
      }).passthrough()).optional(),
    }).passthrough().optional(),
    scheduling: z.object({
      enabled: z.boolean(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      timezone: z.string().optional(),
      timeWindow: z.object({
        startHour: z.number(),
        endHour: z.number(),
        daysOfWeek: z.array(z.number()).optional(),
      }).optional(),
    }).passthrough().optional(),
  }).passthrough(),
  // V3 — optional runtime stacking policy
  runtimeState: z.object({
    stackMode: z.enum(["single", "multiple", "replace-same-kind"]).optional(),
    zIndexBase: z.number().optional(),
  }).passthrough().optional(),
  // V4 — optional goals/variants/experiment (absent = base behavior)
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["click", "submit", "close", "customEvent", "urlVisit"]),
      targetNodeId: z.string().optional(),
      eventName: z.string().optional(),
      urlPattern: z.string().optional(),
    }).passthrough()
  ).optional(),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      weight: z.number(),
      enabled: z.boolean(),
      popupPatch: z.record(z.unknown()).optional(),
      rootNodeId: z.string().optional(),
    }).passthrough()
  ).optional(),
  experiment: z.object({
    enabled: z.boolean(),
    assignment: z.enum(["random", "sticky"]),
    seed: z.string().optional(),
    winnerVariantId: z.string().optional(),
  }).passthrough().optional(),
  // V5 — optional locale/targeting/scheduling/frequency (absent = base behavior)
  locales: z.array(
    z.object({
      locale: z.string(),
      rootNodeId: z.string().optional(),
      popupPatch: z.record(z.unknown()).optional(),
    }).passthrough()
  ).optional(),
  fallbackLocale: z.string().optional(),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.string()).optional(),
    pluginData: z.record(z.unknown()).optional(),
  }),
}).passthrough();

const BuilderDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string().min(1),
  nodes: z.record(BuilderNodeSchema),
  rootNodeId: z.string(),
  popups: z.record(PopupSchema).default({}),
  breakpoints: z.array(
    z.object({
      breakpoint: z.enum(["desktop", "tablet", "mobile"]),
      label: z.string(),
      minWidth: z.number(),
    }).passthrough()
  ),
  variables: z.record(
    z.object({
      key: z.string(),
      type: z.enum(["string", "number", "boolean", "object", "array"]),
      defaultValue: z.unknown(),
    }).passthrough()
  ),
  themeColors: z.array(z.string()).optional(),
});

/**
 * Validates a BuilderDocument against the schema.
 *
 * @param document - The document to validate
 * @returns { valid: true } or { valid: false, errors: string[] }
 */
export function validateDocument(
  document: unknown,
): { valid: true; data: BuilderDocument } | { valid: false; errors: string[] } {
  const result = BuilderDocumentSchema.safeParse(document);
  if (result.success) {
    return { valid: true, data: result.data as unknown as BuilderDocument };
  }
  const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  return { valid: false, errors };
}

/**
 * Validates a single prop value against a PropSchema entry.
 * Returns true if valid, false + reason if not.
 */
export function validatePropSchema(
  key: string,
  value: unknown,
  schema: import("../registry/types").PropSchema,
): { valid: boolean; reason?: string } {
  // Basic type checks
  switch (schema.type) {
    case "string":
      return { valid: typeof value === "string" || value === undefined };
    case "number":
      if (typeof value !== "number" && value !== undefined) {
        return { valid: false, reason: `"${key}" must be a number` };
      }
      if (typeof value === "number") {
        if (schema.min !== undefined && value < schema.min) {
          return { valid: false, reason: `"${key}" must be >= ${schema.min}` };
        }
        if (schema.max !== undefined && value > schema.max) {
          return { valid: false, reason: `"${key}" must be <= ${schema.max}` };
        }
      }
      return { valid: true };
    case "boolean":
      return { valid: typeof value === "boolean" || value === undefined };
    case "select":
      if (value === undefined) return { valid: true };
      if (schema.multiple) {
        return { valid: Array.isArray(value) };
      }
      return {
        valid: schema.options.some((o) => o.value === value),
        reason: `"${key}" must be one of: ${schema.options.map((o) => o.value).join(", ")}`,
      };
    default:
      return { valid: true };
  }
}

/**
 * DocumentValidator class — wraps the validation functions with instance API.
 */
export class DocumentValidator {
  validate(document: unknown) {
    return validateDocument(document);
  }
}
