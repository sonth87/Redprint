import React from "react";
import type { ComponentDefinition, FieldValidationRule } from "@ui-builder/builder-core";
import { useFormRuntimeContext } from "../utils/FormRuntimeContext";

interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldFieldProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  mode: "editor" | "runtime";
}

function normalizeOptions(raw: unknown): SelectFieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
    .map((o) => ({ value: String(o.value ?? ""), label: String(o.label ?? o.value ?? "") }))
    .filter((o) => o.value.length > 0);
}

function SelectFieldField({ node, style, mode }: SelectFieldFieldProps) {
  const name = String(node.props.name ?? "field");
  const label = String(node.props.label ?? "");
  const required = Boolean(node.props.required);
  const placeholder = String(node.props.placeholder ?? "");
  const options = normalizeOptions(node.props.options);
  const fieldId = `${node.id}-field`;

  const formContext = useFormRuntimeContext();
  const errorMessageProp = node.props.errorMessage ? String(node.props.errorMessage) : undefined;
  const fieldError = formContext?.errors?.[name] || errorMessageProp;

  React.useEffect(() => {
    if (mode !== "runtime" || !formContext?.registerField) return undefined;
    const rules: FieldValidationRule[] = [];
    if (required) {
      rules.push({ type: "required", message: errorMessageProp || `${label || name} is required` });
    }
    const customRules = Array.isArray(node.props.validationRules)
      ? (node.props.validationRules as FieldValidationRule[])
      : [];
    rules.push(...customRules);

    if (rules.length > 0) {
      return formContext.registerField(name, rules);
    }
    return undefined;
  }, [mode, formContext, name, required, label, errorMessageProp, node.props.validationRules]);

  return (
    <div data-node-id={mode === "editor" ? node.id : undefined} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label ? (
        <label htmlFor={fieldId} style={{ fontSize: "14px", fontWeight: 500, color: "inherit" }}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <select
        id={fieldId}
        name={name}
        required={required}
        defaultValue=""
        disabled={mode === "editor"}
        aria-required={required || undefined}
        aria-invalid={fieldError ? "true" : undefined}
        onChange={() => {
          if (formContext?.clearError) formContext.clearError(name);
        }}
        // See Input.tsx for why `style` applies to the control itself, not the wrapper.
        style={{
          width: "100%",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          borderColor: fieldError ? "#dc2626" : undefined,
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = fieldError ? "2px solid #dc2626" : "2px solid #2563eb";
          e.currentTarget.style.outlineOffset = "1px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "none";
        }}
      >
        {placeholder ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {fieldError ? (
        <span role="alert" style={{ fontSize: "12px", color: "#dc2626", marginTop: "2px" }}>
          {fieldError}
        </span>
      ) : null}
    </div>
  );
}

export const SelectFieldComponent: ComponentDefinition = {
  // Named "SelectField" (not "Select") to avoid colliding with packages/ui's
  // shadcn-based Select used elsewhere in the editor chrome.
  type: "SelectField",
  name: "Select",
  category: "form",
  group: "form",
  subGroup: "fields",
  description: "A dropdown selection form field.",
  version: "1.0.0",
  tags: ["form", "select", "dropdown", "field"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  aiHints: {
    purpose: "A dropdown form field for choosing one option from a list.",
    bestFor: ["contact form subject/reason picker", "plan selection", "service type"],
    sectionAffinity: ["form"],
    contentSlots: {
      heading: "label",
      items: { prop: "options", shape: "array-of-objects", itemKeys: { title: "label", body: "value" }, maxItems: 10 },
    },
    fallbackTo: ["Text"],
    examples: ["\"How can we help?\" dropdown with a few reason options"],
  },
  propSchema: [
    { key: "name", label: "Field Name", type: "string", required: true, description: "Key used in the submitted form data — must be unique within its Form." },
    { key: "label", label: "Label", type: "string", default: "" },
    { key: "placeholder", label: "Placeholder", type: "string", default: "Select an option" },
    { key: "required", label: "Required", type: "boolean", default: false },
    { key: "errorMessage", label: "Error Message", type: "string", default: "", description: "Custom error message displayed when validation fails." },
    // hidden: no dedicated panel control for "json" exists yet (same limitation
    // as GalleryPro.items, roadmap 03/01) — options ship via defaultProps and
    // AI-authored content; a real options editor UI is a follow-up.
    { key: "options", label: "Options", type: "json", required: true, hidden: true },
  ],
  defaultProps: {
    name: "field",
    label: "Choose an option",
    placeholder: "Select an option",
    required: false,
    errorMessage: "",
    options: [
      { value: "option-1", label: "Option 1" },
      { value: "option-2", label: "Option 2" },
    ],
  },
  defaultStyle: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
  },
  editorRenderer: ({ node, style }) => <SelectFieldField node={node} style={style as React.CSSProperties} mode="editor" />,
  runtimeRenderer: ({ node, style }) => <SelectFieldField node={node} style={style as React.CSSProperties} mode="runtime" />,
};
