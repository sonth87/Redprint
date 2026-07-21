import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { runFormSubmitPipeline, type FormSubmitState } from "../utils/formSubmitPipeline";

interface FormShellProps {
  node: { id: string; props: Record<string, unknown> };
  style: React.CSSProperties;
  children: React.ReactNode;
  mode: "editor" | "runtime";
  onFormSubmit?: (formName: string, fields: Record<string, unknown>) => void;
}

function FormShell({ node, style, children, mode, onFormSubmit }: FormShellProps) {
  const [state, setState] = React.useState<FormSubmitState>({ phase: "idle" });
  const honeypot = Boolean(node.props.honeypot);
  // Re-entrancy guard (roadmap 03/04 corner case: double submit) — a ref
  // (not state) so the in-flight check is synchronous and can't race with
  // React's state update batching.
  const submittingRef = React.useRef(false);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      // Editor mode: never actually submit (no network, no navigation, no state
      // machine) — matches the NavigationMenu convention of neutering real
      // interactive behavior on the canvas.
      if (mode === "editor") {
        event.preventDefault();
        return;
      }
      if (submittingRef.current) {
        event.preventDefault();
        return;
      }
      submittingRef.current = true;
      void runFormSubmitPipeline(event, node, setState, { onFormSubmit }).finally(() => {
        submittingRef.current = false;
      });
    },
    [mode, node, onFormSubmit],
  );

  const successMessage = String(node.props.successMessage ?? "Thank you! We received your submission.");
  const errorMessage = String(node.props.errorMessage ?? "Something went wrong. Please try again.");
  const successBehavior = String(node.props.successBehavior ?? "message");

  if (mode === "runtime" && state.phase === "success" && successBehavior === "replace") {
    return (
      <div style={{ ...style, padding: "16px", textAlign: "center" }} role="status">
        {successMessage}
      </div>
    );
  }

  return (
    <form
      data-node-id={mode === "editor" ? node.id : undefined}
      onSubmit={handleSubmit}
      noValidate={mode === "editor"}
      style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", ...style }}
    >
      {children}
      {honeypot ? (
        <input
          type="text"
          name="_hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
        />
      ) : null}
      {mode === "runtime" && state.phase === "success" && successBehavior === "message" ? (
        <p role="status" style={{ color: "#16a34a", fontSize: "14px" }}>{successMessage}</p>
      ) : null}
      {mode === "runtime" && state.phase === "error" ? (
        <p role="alert" style={{ color: "#dc2626", fontSize: "14px" }}>{errorMessage}</p>
      ) : null}
    </form>
  );
}

export const FormComponent: ComponentDefinition = {
  type: "Form",
  name: "Form",
  category: "form",
  group: "form",
  subGroup: "container",
  description: "A form container — holds Input/Textarea/Select/Checkbox fields plus a submit Button, and handles submission (webhook, callback, or none).",
  version: "1.0.0",
  tags: ["form", "lead-capture", "contact", "submit"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  containerConfig: {
    layoutType: "flow",
    // HTML itself disallows nested <form> elements — enforce the same rule
    // in the builder (roadmap 03/04, corner case).
    disallowedChildTypes: ["Form"],
    emptyStateConfig: { message: "Drop form fields (Input, Textarea, Select, Checkbox) and a submit Button here", allowDrop: true },
  },
  aiHints: {
    purpose: "A form container that collects visitor input and submits it (webhook, host callback, or interactions only).",
    bestFor: ["contact form", "lead capture", "newsletter signup", "booking request"],
    sectionAffinity: ["form", "cta", "footer"],
    fallbackTo: [],
    examples: ["Contact form with name/email/message fields and a submit button, posting to a webhook"],
  },
  propSchema: [
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
    { key: "successMessage", label: "Success Message", type: "string", default: "Thank you! We received your submission." },
    { key: "errorMessage", label: "Error Message", type: "string", default: "Something went wrong. Please try again." },
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
    { key: "resetOnSuccess", label: "Reset Fields After Success", type: "boolean", default: true },
    { key: "honeypot", label: "Honeypot Spam Protection", type: "boolean", default: true },
  ],
  defaultProps: {
    submitAction: "none",
    webhookUrl: "",
    method: "POST",
    successMessage: "Thank you! We received your submission.",
    errorMessage: "Something went wrong. Please try again.",
    successBehavior: "message",
    resetOnSuccess: true,
    honeypot: true,
  },
  defaultStyle: { width: "100%", maxWidth: "480px" },
  editorRenderer: ({ node, style, children }) => (
    <FormShell node={node} style={style as React.CSSProperties} mode="editor">
      {children as React.ReactNode}
    </FormShell>
  ),
  runtimeRenderer: ({ node, style, children, onFormSubmit }) => (
    <FormShell node={node} style={style as React.CSSProperties} mode="runtime" onFormSubmit={onFormSubmit}>
      {children as React.ReactNode}
    </FormShell>
  ),
};
