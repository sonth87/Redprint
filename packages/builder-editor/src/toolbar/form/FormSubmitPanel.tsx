import React from "react";
import { useTranslation } from "react-i18next";
import { Separator } from "@ui-builder/ui";
import type { BuilderNode, PropSchema } from "@ui-builder/builder-core";
import { PropControl } from "../../panels/right/controls/PropControl";

type DispatchCommand = (command: { type: "UPDATE_PROPS"; payload: Record<string, unknown>; description?: string }) => void;

export interface FormSubmitPanelProps {
  node: BuilderNode;
  dispatch: DispatchCommand;
}

// Mirrors Form.tsx's propSchema exactly — kept in sync manually since this
// panel renders the same 8 fields DesignTab's props loop now excludes
// entirely for Form (see DesignTab.tsx). Grouped by when in the submit
// lifecycle each field applies, not by data type — a grouping the flat
// generic loop couldn't express.
const SUBMIT_ACTION_FIELDS: PropSchema[] = [
  {
    key: "submitAction",
    label: "On Submit",
    type: "select",
    options: [
      { value: "webhook", label: "Send to webhook URL" },
      { value: "emit", label: "Notify host app (onFormSubmit callback)" },
      { value: "none", label: "Do nothing (interactions only)" },
    ],
    default: "none",
  },
  { key: "webhookUrl", label: "Webhook URL", type: "string", default: "", description: "Required when 'On Submit' is 'Send to webhook URL'. Must be https:// (or http://localhost for local dev)." },
  { key: "method", label: "HTTP Method", type: "select", options: [{ value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }], default: "POST" },
];

const AFTER_SUBMIT_FIELDS: PropSchema[] = [
  {
    key: "successBehavior",
    label: "On Success",
    type: "select",
    options: [
      { value: "message", label: "Show message below form" },
      { value: "replace", label: "Replace form with message" },
      { value: "none", label: "Nothing (rely on interactions)" },
    ],
    default: "message",
  },
  { key: "successMessage", label: "Success Message", type: "string", default: "Thank you! We received your submission." },
  { key: "errorMessage", label: "Error Message", type: "string", default: "Something went wrong. Please try again." },
  { key: "resetOnSuccess", label: "Reset Fields After Success", type: "boolean", default: true },
];

const SECURITY_FIELDS: PropSchema[] = [
  { key: "honeypot", label: "Honeypot Spam Protection", type: "boolean", default: true },
];

function FieldGroup({ title, fields, node, dispatch }: { title: string; fields: PropSchema[]; node: BuilderNode; dispatch: DispatchCommand }) {
  const update = (key: string, value: unknown) => {
    dispatch({ type: "UPDATE_PROPS", payload: { nodeId: node.id, props: { [key]: value } }, description: `Form submit settings — ${key}` });
  };
  return (
    <div className="grid gap-3">
      <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{title}</p>
      {fields.map((schema) => (
        <PropControl key={schema.key} schema={schema} value={node.props[schema.key]} onChange={(v) => update(schema.key, v)} />
      ))}
    </div>
  );
}

/**
 * Submit configuration for the Form component (roadmap 03/04 follow-up) —
 * lives on the ContextualToolbar (like NavigationMenu's "Manage Menu"), not
 * in DesignTab's generic propSchema loop. Every field here is submit
 * behavior/lifecycle (webhook target, success/error copy, reset, honeypot),
 * not visual design — mixing them into Design alongside color/spacing
 * controls made the panel read as "no organizing rule". `DesignTab.tsx`
 * excludes Form's props section entirely as a result.
 */
export function FormSubmitPanel({ node, dispatch }: FormSubmitPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 p-4">
      <FieldGroup title={t("formToolbar.submit.action", "Submit Action")} fields={SUBMIT_ACTION_FIELDS} node={node} dispatch={dispatch} />
      <Separator />
      <FieldGroup title={t("formToolbar.submit.afterSubmit", "After Submit")} fields={AFTER_SUBMIT_FIELDS} node={node} dispatch={dispatch} />
      <Separator />
      <FieldGroup title={t("formToolbar.submit.security", "Security")} fields={SECURITY_FIELDS} node={node} dispatch={dispatch} />
    </div>
  );
}
