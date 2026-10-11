/**
 * Pure form field validation engine.
 * Framework-agnostic, no React or DOM dependencies.
 */

export type ValidationRuleType =
  | "required"
  | "email"
  | "phone"
  | "regex"
  | "minLength"
  | "maxLength";

export interface FieldValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message: string;
}

// Standard permissive email regex matching common email patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Standard phone regex: supports optional leading '+', digits, spaces, hyphens, parentheses (min 8, max 15 digits)
const PHONE_DIGIT_COUNT_REGEX = /^\+?[\d\s().-]{8,20}$/;

/**
 * Validates a single value against an ordered list of validation rules.
 * Returns the first error message encountered, or `null` if all rules pass.
 */
export function validateField(
  value: unknown,
  rules: FieldValidationRule[] | undefined,
): string | null {
  if (!rules || rules.length === 0) return null;

  const strValue = typeof value === "string" ? value.trim() : "";
  const isPresent =
    value !== null &&
    value !== undefined &&
    (typeof value === "boolean" ? value : strValue.length > 0);

  for (const rule of rules) {
    if (rule.type === "required") {
      if (!isPresent) {
        return rule.message;
      }
      continue;
    }

    // Non-required rules only apply when a value has been entered
    if (!isPresent) {
      continue;
    }

    switch (rule.type) {
      case "email": {
        if (!EMAIL_REGEX.test(strValue)) {
          return rule.message;
        }
        break;
      }

      case "phone": {
        const rawDigits = strValue.replace(/\D/g, "");
        if (
          !PHONE_DIGIT_COUNT_REGEX.test(strValue) ||
          rawDigits.length < 8 ||
          rawDigits.length > 15
        ) {
          return rule.message;
        }
        break;
      }

      case "minLength": {
        const min = typeof rule.value === "number" ? rule.value : parseInt(String(rule.value ?? 0), 10);
        if (strValue.length < min) {
          return rule.message;
        }
        break;
      }

      case "maxLength": {
        const max = typeof rule.value === "number" ? rule.value : parseInt(String(rule.value ?? Infinity), 10);
        if (strValue.length > max) {
          return rule.message;
        }
        break;
      }

      case "regex": {
        if (typeof rule.value === "string" && rule.value.length > 0) {
          try {
            const re = new RegExp(rule.value);
            if (!re.test(strValue)) {
              return rule.message;
            }
          } catch {
            // If regex pattern is invalid, fail gracefully without throwing
            return rule.message;
          }
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Validates all fields in a form given a map of values and a map of rules per field.
 * Returns a dictionary mapping field name to error message for any failing fields.
 * If all fields pass, returns an empty object `{}`.
 */
export function validateFormFields(
  values: Record<string, unknown>,
  rules: Record<string, FieldValidationRule[]>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const error = validateField(values[fieldName], fieldRules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}
