import React from "react";
import type { FieldValidationRule } from "@ui-builder/builder-core";

export interface FormRuntimeContextValue {
  errors: Record<string, string>;
  isSubmitting: boolean;
  registerField?: (name: string, rules: FieldValidationRule[]) => () => void;
  clearError?: (fieldName: string) => void;
}

export const FormRuntimeContext = React.createContext<FormRuntimeContextValue | null>(null);

export function useFormRuntimeContext(): FormRuntimeContextValue | null {
  return React.useContext(FormRuntimeContext);
}
