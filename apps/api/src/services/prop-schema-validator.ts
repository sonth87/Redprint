import type { ComponentContract, PropContract } from "./component-contract-resolver.js";

export interface PropValidationError {
  key: string;
  code: "missing_required" | "invalid_type" | "invalid_option" | "below_min" | "above_max";
  message: string;
}

export interface PropValidationResult {
  valid: boolean;
  repairedProps: Record<string, unknown>;
  errors: PropValidationError[];
  warnings: string[];
}

function repairPrimitive(value: unknown, prop: PropContract): unknown {
  if (value !== undefined && value !== null) return value;
  if (prop.default !== undefined) return prop.default;
  if (prop.type === "string" || prop.type === "richtext" || prop.type === "image" || prop.type === "video") return "";
  if (prop.type === "number" || prop.type === "slider") return prop.min ?? 0;
  if (prop.type === "boolean") return false;
  if (prop.type === "select") return prop.multiple ? [] : prop.options?.[0]?.value ?? "";
  if (prop.type === "json") return {};
  return undefined;
}

function validateValue(value: unknown, prop: PropContract): PropValidationError | null {
  if (value === undefined || value === null || value === "") {
    return prop.required
      ? { key: prop.key, code: "missing_required", message: `${prop.key} is required` }
      : null;
  }

  if (prop.type === "number" || prop.type === "slider") {
    if (typeof value !== "number") {
      return { key: prop.key, code: "invalid_type", message: `${prop.key} must be a number` };
    }
    if (prop.min !== undefined && value < prop.min) {
      return { key: prop.key, code: "below_min", message: `${prop.key} must be >= ${prop.min}` };
    }
    if (prop.max !== undefined && value > prop.max) {
      return { key: prop.key, code: "above_max", message: `${prop.key} must be <= ${prop.max}` };
    }
  }

  if (prop.type === "boolean" && typeof value !== "boolean") {
    return { key: prop.key, code: "invalid_type", message: `${prop.key} must be boolean` };
  }

  if (["string", "richtext", "image", "video", "color", "icon", "font"].includes(prop.type) && typeof value !== "string") {
    return { key: prop.key, code: "invalid_type", message: `${prop.key} must be string` };
  }

  if (prop.type === "select" && prop.options?.length) {
    if (prop.multiple) {
      if (!Array.isArray(value)) {
        return { key: prop.key, code: "invalid_type", message: `${prop.key} must be an array` };
      }
      const allowed = new Set(prop.options.map((option) => option.value));
      if (!value.every((item) => typeof item === "string" && allowed.has(item))) {
        return { key: prop.key, code: "invalid_option", message: `${prop.key} contains unsupported option` };
      }
    } else if (typeof value !== "string" || !prop.options.some((option) => option.value === value)) {
      return {
        key: prop.key,
        code: "invalid_option",
        message: `${prop.key} must be one of ${prop.options.map((option) => option.value).join(", ")}`,
      };
    }
  }

  return null;
}

export function validatePropsAgainstContract(
  contract: ComponentContract | undefined,
  props: Record<string, unknown>,
): PropValidationResult {
  if (!contract) {
    return { valid: true, repairedProps: props, errors: [], warnings: ["No contract available"] };
  }

  const repairedProps = { ...contract.defaultProps, ...props };
  const errors: PropValidationError[] = [];
  const allProps = [...contract.requiredProps, ...contract.optionalProps];

  for (const prop of allProps) {
    if (repairedProps[prop.key] === undefined && (prop.required || prop.default !== undefined)) {
      repairedProps[prop.key] = repairPrimitive(undefined, prop);
    }
    const error = validateValue(repairedProps[prop.key], prop);
    if (error) errors.push(error);
  }

  return {
    valid: errors.length === 0,
    repairedProps,
    errors,
    warnings: [],
  };
}
