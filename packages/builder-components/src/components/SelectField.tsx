import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
        // See Input.tsx for why `style` applies to the control itself, not the wrapper.
        style={{ width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box", ...style }}
        onFocus={(e) => {
          e.currentTarget.style.outline = "2px solid #2563eb";
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
