/**
 * serializeComponents — compact AI-friendly component manifest.
 *
 * serializeComponentsCompact(): converts ComponentDefinition[] into a terse
 * one-line-per-component string that tells the AI:
 *   • whether it can contain children (+) or is a leaf (-)
 *   • what props it accepts, with valid options / ranges / defaults
 *
 * Format:
 *   +Section(layout): minHeight(num=400,100:4000:px)
 *   -Button(interactive): label(rich) variant[primary*|secondary|outline|ghost|destructive] size[sm|md*|lg] disabled(bool=false)
 *   [opt1*|opt2] = select with * marking default
 *   (num=default,min:max:unit) = number with optional range/unit
 *   (bool=true/false) = boolean with default
 *   (rich) = richtext HTML content
 *   (color) = color picker
 *   (img)/(vid) = media upload
 *
 * deriveNestingRules(): builds a human-readable hierarchy description from
 * capabilities.canContainChildren and containerConfig.allowedChildTypes so
 * the AI knows valid parent→child relationships.
 */
import type { ComponentDefinition, PropSchema } from "@ui-builder/builder-core";

// ── Prop serializer ──────────────────────────────────────────────────────────

function serializeProp(schema: PropSchema): string | null {
  if (schema.type === "group") return null; // groups are structural, skip

  const k = schema.key;

  switch (schema.type) {
    case "select": {
      const opts = schema.options
        .map((o) => (o.value === schema.default ? `${o.value}*` : o.value))
        .join("|");
      return `${k}[${opts}]`;
    }
    case "number": {
      const def = schema.default != null ? `=${schema.default}` : "";
      const range =
        schema.min != null && schema.max != null
          ? `,${schema.min}:${schema.max}${schema.unit ? `:${schema.unit}` : ""}`
          : schema.unit
          ? `:${schema.unit}`
          : "";
      return `${k}(num${def}${range})`;
    }
    case "boolean": {
      return `${k}(bool=${schema.default ?? false})`;
    }
    case "richtext": {
      return `${k}(rich)`;
    }
    case "color": {
      return `${k}(color)`;
    }
    case "image": {
      return `${k}(img)`;
    }
    case "video": {
      return `${k}(vid)`;
    }
    case "slider": {
      const def = schema.default != null ? `=${schema.default}` : "";
      return `${k}(num${def},${schema.min}:${schema.max})`;
    }
    // Plain string/text types — only include if they carry meaningful info
    case "string":
    case "spacing":
    case "border":
    case "shadow":
    case "icon":
    case "font":
    case "json":
    case "data-binding":
      return null; // too verbose for the compact manifest
    default:
      return null;
  }
}

// ── Component serializer ─────────────────────────────────────────────────────

/**
 * Converts a ComponentDefinition array into a compact multi-line manifest.
 * Each line describes one component with its key props and constraints.
 *
 * @example
 * "+Section(layout): minHeight(num=400,100:4000:px)"
 * "-Button(interactive): label(rich) variant[primary*|secondary|outline|ghost] size[sm|md*|lg] disabled(bool=false)"
 */
export function serializeComponentsCompact(components: ComponentDefinition[]): string {
  return components
    .map((c) => {
      const prefix = c.capabilities.canContainChildren ? "+" : "-";
      const propParts = c.propSchema
        .flatMap((s): string[] => {
          if (s.type === "group" && "children" in s && Array.isArray(s.children)) {
            // Flatten group children
            return (s.children as PropSchema[]).map(serializeProp).filter((p): p is string => p !== null);
          }
          const part = serializeProp(s);
          return part ? [part] : [];
        });
      const propsStr = propParts.length > 0 ? `: ${propParts.join(" ")}` : "";
      return `${prefix}${c.type}(${c.category})${propsStr}`;
    })
    .join("\n");
}

// ── Nesting rules deriver ─────────────────────────────────────────────────────

/**
 * Derives human-readable nesting rules from component capabilities.
 * Replaces the hardcoded "Section → Column/Grid → leaf" strings scattered
 * across prompts.
 */
export function deriveNestingRules(components: ComponentDefinition[]): string {
  const containers = components.filter((c) => c.capabilities.canContainChildren);
  const leaves = components.filter((c) => !c.capabilities.canContainChildren);

  const containerNames = containers.map((c) => c.type);
  const leafNames = leaves.map((c) => c.type);

  const lines: string[] = [
    `Container components (can have children): ${containerNames.join(", ")}`,
    `Leaf components (no children): ${leafNames.join(", ")}`,
  ];

  // List any containers with restricted child types
  for (const c of containers) {
    const allowed = c.containerConfig?.allowedChildTypes;
    if (allowed && allowed.length > 0) {
      lines.push(`${c.type} only accepts: ${allowed.join(", ")}`);
    }
  }

  lines.push(
    "Always build pages with proper nesting: Section → Container/Grid/Column → leaf nodes.",
    "Never place leaf nodes directly into root — wrap them in a Section or Container first.",
  );

  return lines.join("\n");
}
