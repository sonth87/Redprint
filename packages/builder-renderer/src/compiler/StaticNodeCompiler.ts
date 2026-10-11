import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";

/**
 * Basic HTML attribute escaping.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Compiles a single BuilderNode and its children into semantic HTML string.
 */
export function compileNodeToHtml(nodeId: string, document: BuilderDocument): string {
  const node = document.nodes[nodeId];
  if (!node) return "";

  const className = `ub-node-${node.id}`;
  const childIds = Object.values(document.nodes)
    .filter((n): n is BuilderNode => Boolean(n && n.parentId === nodeId))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((n) => n.id);

  const childrenHtml = childIds
    .map((childId) => compileNodeToHtml(childId, document))
    .join("");

  switch (node.type) {
    case "Section": {
      return `<section class="${className}">${childrenHtml}</section>`;
    }

    case "Container":
    case "Row":
    case "Column":
    case "Grid":
    case "Repeater": {
      return `<div class="${className}">${childrenHtml}</div>`;
    }

    case "Text": {
      const tag = String(node.props.tag || "p").toLowerCase();
      const validTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div", "blockquote"];
      const finalTag = validTags.includes(tag) ? tag : "p";
      const content = String(node.props.content ?? node.props.text ?? "");
      return `<${finalTag} class="${className}">${content}</${finalTag}>`;
    }

    case "Button": {
      const label = escapeHtml(node.props.text ?? node.props.label ?? "Button");
      const href = node.props.href ? String(node.props.href) : "";
      if (href) {
        const target = node.props.target ? escapeHtml(node.props.target) : "_self";
        return `<a href="${escapeHtml(href)}" target="${target}" class="${className}" role="button">${label}</a>`;
      }
      return `<button type="button" class="${className}">${label}</button>`;
    }

    case "Image": {
      const src = escapeHtml(node.props.src ?? node.props.url ?? "");
      const alt = escapeHtml(node.props.alt ?? "");
      const caption = node.props.caption ? escapeHtml(node.props.caption) : "";
      if (!src) return "";
      const imgTag = `<img src="${src}" alt="${alt}" loading="lazy" decoding="async" class="${className}" />`;
      if (caption) {
        return `<figure class="${className}-figure">${imgTag}<figcaption>${caption}</figcaption></figure>`;
      }
      return imgTag;
    }

    case "Divider": {
      return `<hr class="${className}" />`;
    }

    case "Form": {
      const submitAction = String(node.props.submitAction ?? "none");
      const method = String(node.props.method ?? "POST");
      const action = submitAction === "webhook" ? String(node.props.webhookUrl ?? "") : "";
      return `<form action="${escapeHtml(action)}" method="${escapeHtml(method)}" class="${className}">${childrenHtml}</form>`;
    }

    case "Input": {
      const name = escapeHtml(node.props.name ?? "field");
      const inputType = escapeHtml(node.props.inputType ?? "text");
      const placeholder = escapeHtml(node.props.placeholder ?? "");
      const label = node.props.label ? escapeHtml(node.props.label) : "";
      const required = Boolean(node.props.required);
      return `<div class="ub-field-group">` +
        (label ? `<label>${label}${required ? " *" : ""}</label>` : "") +
        `<input type="${inputType}" name="${name}" placeholder="${placeholder}" ${required ? "required " : ""}class="${className}" />` +
        `</div>`;
    }

    case "Textarea": {
      const name = escapeHtml(node.props.name ?? "message");
      const placeholder = escapeHtml(node.props.placeholder ?? "");
      const label = node.props.label ? escapeHtml(node.props.label) : "";
      const rows = Number(node.props.rows ?? 4);
      const required = Boolean(node.props.required);
      return `<div class="ub-field-group">` +
        (label ? `<label>${label}${required ? " *" : ""}</label>` : "") +
        `<textarea name="${name}" placeholder="${placeholder}" rows="${rows}" ${required ? "required " : ""}class="${className}"></textarea>` +
        `</div>`;
    }

    case "SelectField": {
      const name = escapeHtml(node.props.name ?? "field");
      const label = node.props.label ? escapeHtml(node.props.label) : "";
      const required = Boolean(node.props.required);
      const placeholder = node.props.placeholder ? escapeHtml(node.props.placeholder) : "";
      const options = Array.isArray(node.props.options) ? node.props.options : [];
      let optionsHtml = placeholder ? `<option value="" disabled selected>${placeholder}</option>` : "";
      for (const opt of options) {
        if (opt && typeof opt === "object") {
          const val = escapeHtml((opt as any).value ?? "");
          const lbl = escapeHtml((opt as any).label ?? val);
          optionsHtml += `<option value="${val}">${lbl}</option>`;
        }
      }
      return `<div class="ub-field-group">` +
        (label ? `<label>${label}${required ? " *" : ""}</label>` : "") +
        `<select name="${name}" ${required ? "required " : ""}class="${className}">${optionsHtml}</select>` +
        `</div>`;
    }

    case "Checkbox": {
      const name = escapeHtml(node.props.name ?? "consent");
      const required = Boolean(node.props.required);
      const labelHtml = String(node.props.label ?? "I agree");
      return `<div class="ub-checkbox-group">` +
        `<label><input type="checkbox" name="${name}" value="true" ${required ? "required " : ""}class="${className}" /> <span>${labelHtml}</span></label>` +
        `</div>`;
    }

    case "Anchor": {
      const anchorId = escapeHtml(node.props.anchorId ?? node.id);
      return `<a id="${anchorId}" class="${className}"></a>`;
    }

    default: {
      return `<div class="${className}">${childrenHtml}</div>`;
    }
  }
}
