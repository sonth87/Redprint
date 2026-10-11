import React from "react";
import type { ComponentDefinition, FieldValidationRule } from "@ui-builder/builder-core";
import { sanitizeHtml } from "../utils/sanitize";
import { useFormRuntimeContext } from "../utils/FormRuntimeContext";

interface CheckboxFieldProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  mode: "editor" | "runtime";
}

function CheckboxField({ node, style, mode }: CheckboxFieldProps) {
  const name = String(node.props.name ?? "consent");
  const labelHtml = String(node.props.label ?? "<p>I agree</p>");
  const required = Boolean(node.props.required);
  const fieldId = `${node.id}-field`;

  const formContext = useFormRuntimeContext();
  const errorMessageProp = node.props.errorMessage ? String(node.props.errorMessage) : undefined;
  const fieldError = formContext?.errors?.[name] || errorMessageProp;

  React.useEffect(() => {
    if (mode !== "runtime" || !formContext?.registerField) return undefined;
    const rules: FieldValidationRule[] = [];
    if (required) {
      rules.push({ type: "required", message: errorMessageProp || "Please check this box to proceed" });
    }
    const customRules = Array.isArray(node.props.validationRules)
      ? (node.props.validationRules as FieldValidationRule[])
      : [];
    rules.push(...customRules);

    if (rules.length > 0) {
      return formContext.registerField(name, rules);
    }
    return undefined;
  }, [mode, formContext, name, required, errorMessageProp, node.props.validationRules]);

  return (
    <div
      data-node-id={mode === "editor" ? node.id : undefined}
      style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%", ...style }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", width: "100%" }}>
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          value="true"
          required={required}
          disabled={mode === "editor"}
          tabIndex={mode === "editor" ? -1 : undefined}
          aria-required={required || undefined}
          aria-invalid={fieldError ? "true" : undefined}
          onChange={() => {
            if (formContext?.clearError) formContext.clearError(name);
          }}
          style={{
            marginTop: "3px",
            width: "16px",
            height: "16px",
            flexShrink: 0,
            cursor: mode === "editor" ? "default" : "pointer",
            outline: fieldError ? "2px solid #dc2626" : undefined,
          }}
        />
        <label
          htmlFor={fieldId}
          style={{ fontSize: "14px", lineHeight: "1.5", color: "inherit" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(labelHtml) }}
        />
        {required ? <span aria-hidden="true" style={{ fontSize: "14px" }}> *</span> : null}
      </div>
      {fieldError ? (
        <span role="alert" style={{ fontSize: "12px", color: "#dc2626", marginLeft: "24px" }}>
          {fieldError}
        </span>
      ) : null}
    </div>
  );
}

export const CheckboxComponent: ComponentDefinition = {
  type: "Checkbox",
  name: "Checkbox",
  category: "form",
  group: "form",
  subGroup: "fields",
  description: "A checkbox for consent/opt-in, e.g. agreeing to terms.",
  version: "1.0.0",
  tags: ["form", "checkbox", "consent", "opt-in"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
    inlineEditable: true,
  },
  aiHints: {
    purpose: "A checkbox for consent or opt-in, typically linking to terms/privacy policy.",
    bestFor: ["terms and conditions agreement", "marketing opt-in", "newsletter consent"],
    sectionAffinity: ["form"],
    contentSlots: { heading: "label" },
    fallbackTo: ["Text"],
    examples: ["\"I agree to the Terms of Service\" required checkbox"],
  },
  propSchema: [
    { key: "name", label: "Field Name", type: "string", required: true, description: "Key used in the submitted form data — must be unique within its Form." },
    {
      key: "label",
      label: "Label",
      type: "richtext",
      required: true,
      toolbar: { bold: false, italic: false, underline: false, strikethrough: false, link: true, align: false },
    },
    { key: "required", label: "Required", type: "boolean", default: false },
    { key: "errorMessage", label: "Error Message", type: "string", default: "", description: "Custom error message displayed when validation fails." },
  ],
  defaultProps: { name: "consent", label: "<p>I agree to the Terms of Service</p>", required: false, errorMessage: "" },
  defaultStyle: { width: "100%" },
  editorRenderer: ({ node, style }) => <CheckboxField node={node} style={style as React.CSSProperties} mode="editor" />,
  runtimeRenderer: ({ node, style }) => <CheckboxField node={node} style={style as React.CSSProperties} mode="runtime" />,
};
