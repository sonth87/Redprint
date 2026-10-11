import React from "react";
import type { ComponentDefinition, FieldValidationRule } from "@ui-builder/builder-core";
import { useFormRuntimeContext } from "../utils/FormRuntimeContext";

interface TextareaFieldProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  mode: "editor" | "runtime";
}

function TextareaField({ node, style, mode }: TextareaFieldProps) {
  const name = String(node.props.name ?? "message");
  const label = String(node.props.label ?? "");
  const placeholder = String(node.props.placeholder ?? "");
  const required = Boolean(node.props.required);
  const rows = Number(node.props.rows ?? 4);
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
      <textarea
        id={fieldId}
        name={name}
        placeholder={placeholder || undefined}
        required={required}
        rows={rows}
        readOnly={mode === "editor"}
        tabIndex={mode === "editor" ? -1 : undefined}
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
          resize: "vertical",
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
      />
      {fieldError ? (
        <span role="alert" style={{ fontSize: "12px", color: "#dc2626", marginTop: "2px" }}>
          {fieldError}
        </span>
      ) : null}
    </div>
  );
}

export const TextareaComponent: ComponentDefinition = {
  type: "Textarea",
  name: "Textarea",
  category: "form",
  group: "form",
  subGroup: "fields",
  description: "A multi-line text input field for longer messages.",
  version: "1.0.0",
  tags: ["form", "textarea", "field", "message"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  aiHints: {
    purpose: "A multi-line form input for longer free-text content like a message or comment.",
    bestFor: ["contact form message field", "feedback", "comments"],
    sectionAffinity: ["form", "cta"],
    contentSlots: { heading: "label" },
    fallbackTo: ["Text"],
    examples: ["Message field with rows=5 in a contact form"],
  },
  propSchema: [
    { key: "name", label: "Field Name", type: "string", required: true, description: "Key used in the submitted form data — must be unique within its Form." },
    { key: "label", label: "Label", type: "string", default: "" },
    { key: "placeholder", label: "Placeholder", type: "string", default: "" },
    { key: "required", label: "Required", type: "boolean", default: false },
    { key: "rows", label: "Rows", type: "number", default: 4, min: 2, max: 20, step: 1 },
    { key: "errorMessage", label: "Error Message", type: "string", default: "", description: "Custom error message displayed when validation fails." },
  ],
  defaultProps: { name: "message", label: "Message", placeholder: "", required: false, rows: 4, errorMessage: "" },
  defaultStyle: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
  },
  editorRenderer: ({ node, style }) => <TextareaField node={node} style={style as React.CSSProperties} mode="editor" />,
  runtimeRenderer: ({ node, style }) => <TextareaField node={node} style={style as React.CSSProperties} mode="runtime" />,
};
