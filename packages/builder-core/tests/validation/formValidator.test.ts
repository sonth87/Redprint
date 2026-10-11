import { describe, it, expect } from "vitest";
import {
  validateField,
  validateFormFields,
  type FieldValidationRule,
} from "../../src/validation/formValidator";

describe("formValidator", () => {
  describe("validateField", () => {
    it("returns null when no rules are provided or rules array is empty", () => {
      expect(validateField("hello", undefined)).toBeNull();
      expect(validateField("hello", [])).toBeNull();
    });

    it("validates required rule", () => {
      const rules: FieldValidationRule[] = [
        { type: "required", message: "This field is required" },
      ];

      expect(validateField("", rules)).toBe("This field is required");
      expect(validateField("   ", rules)).toBe("This field is required");
      expect(validateField(null, rules)).toBe("This field is required");
      expect(validateField(undefined, rules)).toBe("This field is required");
      expect(validateField(false, rules)).toBe("This field is required");
      expect(validateField(true, rules)).toBeNull();
      expect(validateField("valid value", rules)).toBeNull();
    });

    it("skips non-required rules if value is empty/absent (optional field behavior)", () => {
      const rules: FieldValidationRule[] = [
        { type: "email", message: "Invalid email" },
      ];

      expect(validateField("", rules)).toBeNull();
      expect(validateField(null, rules)).toBeNull();
      expect(validateField(undefined, rules)).toBeNull();
    });

    it("validates email rule when value is present", () => {
      const rules: FieldValidationRule[] = [
        { type: "email", message: "Please enter a valid email address" },
      ];

      expect(validateField("test@example.com", rules)).toBeNull();
      expect(validateField("user.name+tag@domain.co.uk", rules)).toBeNull();
      expect(validateField("invalid-email", rules)).toBe("Please enter a valid email address");
      expect(validateField("@missing-user.com", rules)).toBe("Please enter a valid email address");
      expect(validateField("missing-domain@", rules)).toBe("Please enter a valid email address");
      expect(validateField("missing@domain", rules)).toBe("Please enter a valid email address");
    });

    it("validates phone rule when value is present", () => {
      const rules: FieldValidationRule[] = [
        { type: "phone", message: "Please enter a valid phone number" },
      ];

      expect(validateField("+84 912 345 678", rules)).toBeNull();
      expect(validateField("0912345678", rules)).toBeNull();
      expect(validateField("+1 (555) 234-5678", rules)).toBeNull();
      expect(validateField("123", rules)).toBe("Please enter a valid phone number");
      expect(validateField("abc-def-ghij", rules)).toBe("Please enter a valid phone number");
    });

    it("validates minLength rule", () => {
      const rules: FieldValidationRule[] = [
        { type: "minLength", value: 5, message: "Must be at least 5 characters" },
      ];

      expect(validateField("12345", rules)).toBeNull();
      expect(validateField("123456", rules)).toBeNull();
      expect(validateField("1234", rules)).toBe("Must be at least 5 characters");
    });

    it("validates maxLength rule", () => {
      const rules: FieldValidationRule[] = [
        { type: "maxLength", value: 10, message: "Must be at most 10 characters" },
      ];

      expect(validateField("1234567890", rules)).toBeNull();
      expect(validateField("1234", rules)).toBeNull();
      expect(validateField("12345678901", rules)).toBe("Must be at most 10 characters");
    });

    it("validates custom regex rule", () => {
      const rules: FieldValidationRule[] = [
        { type: "regex", value: "^[A-Z]{3}-[0-9]{3}$", message: "Code must match AAA-123" },
      ];

      expect(validateField("ABC-123", rules)).toBeNull();
      expect(validateField("abc-123", rules)).toBe("Code must match AAA-123");
      expect(validateField("ABCD-12", rules)).toBe("Code must match AAA-123");
    });

    it("stops on the first failing rule in chain", () => {
      const rules: FieldValidationRule[] = [
        { type: "required", message: "Required" },
        { type: "minLength", value: 8, message: "Min 8 chars" },
        { type: "email", message: "Invalid email" },
      ];

      expect(validateField("", rules)).toBe("Required");
      expect(validateField("a@b", rules)).toBe("Min 8 chars");
      expect(validateField("not-an-email-at-all", rules)).toBe("Invalid email");
      expect(validateField("alice@example.com", rules)).toBeNull();
    });
  });

  describe("validateFormFields", () => {
    it("returns empty object when all fields are valid", () => {
      const values = {
        name: "Alice",
        email: "alice@example.com",
        phone: "0912345678",
      };
      const rules: Record<string, FieldValidationRule[]> = {
        name: [{ type: "required", message: "Name is required" }],
        email: [
          { type: "required", message: "Email is required" },
          { type: "email", message: "Invalid email" },
        ],
        phone: [{ type: "phone", message: "Invalid phone" }],
      };

      const errors = validateFormFields(values, rules);
      expect(errors).toEqual({});
    });

    it("collects errors for all invalid fields", () => {
      const values = {
        name: "",
        email: "invalid-email",
        phone: "123",
      };
      const rules: Record<string, FieldValidationRule[]> = {
        name: [{ type: "required", message: "Name is required" }],
        email: [{ type: "email", message: "Invalid email" }],
        phone: [{ type: "phone", message: "Invalid phone" }],
      };

      const errors = validateFormFields(values, rules);
      expect(errors).toEqual({
        name: "Name is required",
        email: "Invalid email",
        phone: "Invalid phone",
      });
    });
  });
});
