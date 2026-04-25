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

const BuilderDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string().min(1),
  nodes: z.record(BuilderNodeSchema),
  rootNodeId: z.string(),
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
