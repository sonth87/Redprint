import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

type InputFieldType = "text" | "email" | "tel" | "number" | "date" | "url";

interface InputFieldProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  mode: "editor" | "runtime";
}

function InputField({ node, style, mode }: InputFieldProps) {
  const name = String(node.props.name ?? "field");
  const inputType = (node.props.inputType as InputFieldType) ?? "text";
  const label = String(node.props.label ?? "");
  const placeholder = String(node.props.placeholder ?? "");
  const required = Boolean(node.props.required);
  const pattern = typeof node.props.pattern === "string" && node.props.pattern ? node.props.pattern : undefined;
  const fieldId = `${node.id}-field`;

  return (
    <div data-node-id={mode === "editor" ? node.id : undefined} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label ? (
        <label htmlFor={fieldId} style={{ fontSize: "14px", fontWeight: 500, color: "inherit" }}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <input
        id={fieldId}
        name={name}
        type={inputType}
        placeholder={placeholder || undefined}
        required={required}
        pattern={pattern}
        // Editor mode: fully inert (no typing, no focus ring interaction implied by real use).
        readOnly={mode === "editor"}
        tabIndex={mode === "editor" ? -1 : undefined}
        aria-required={required || undefined}
        // `style` (from the panel/defaultStyle, same StyleConfig pipeline every
        // other component uses) applies straight to the real control, not to
        // the wrapper div — so font/color/padding/border edits actually affect
        // the visible input, not an invisible layout box around it.
        style={{ width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box", ...style }}
        // Focus ring is an outline (not a borderColor override) so it never
        // fights with whatever border color/width the style panel sets —
        // clearing it on blur always restores the panel's own border exactly.
        onFocus={(e) => {
          e.currentTarget.style.outline = "2px solid #2563eb";
          e.currentTarget.style.outlineOffset = "1px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "none";
        }}
      />
    </div>
  );
}

export const InputComponent: ComponentDefinition = {
  type: "Input",
  name: "Input",
  category: "form",
  group: "form",
  subGroup: "fields",
  description: "A single-line text input field (text, email, phone, number, date, url).",
  version: "1.0.0",
  tags: ["form", "input", "field", "text", "email"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  aiHints: {
    purpose: "A single-line form input for collecting one piece of text/email/phone/number/date data.",
    bestFor: ["contact form name field", "email capture", "phone number", "lead form fields"],
    sectionAffinity: ["form", "cta", "footer"],
    contentSlots: { heading: "label" },
    fallbackTo: ["Text"],
    examples: ["Email field with inputType=\"email\" and required=true"],
  },
  propSchema: [
    { key: "name", label: "Field Name", type: "string", required: true, description: "Key used in the submitted form data — must be unique within its Form." },
    {
      key: "inputType",
      label: "Input Type",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "email", label: "Email" },
        { value: "tel", label: "Phone" },
        { value: "number", label: "Number" },
        { value: "date", label: "Date" },
        { value: "url", label: "URL" },
      ],
      default: "text",
    },
    { key: "label", label: "Label", type: "string", default: "" },
    { key: "placeholder", label: "Placeholder", type: "string", default: "" },
    { key: "required", label: "Required", type: "boolean", default: false },
    { key: "pattern", label: "Validation Pattern (regex, optional)", type: "string", default: "" },
  ],
  defaultProps: { name: "field", inputType: "text", label: "Label", placeholder: "", required: false, pattern: "" },
  defaultStyle: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
  },
  editorRenderer: ({ node, style }) => <InputField node={node} style={style as React.CSSProperties} mode="editor" />,
  runtimeRenderer: ({ node, style }) => <InputField node={node} style={style as React.CSSProperties} mode="runtime" />,
};
