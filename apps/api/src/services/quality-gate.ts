/**
 * Quality Gate — deterministic post-compile checks (roadmap 02/04).
 *
 * The compile-time validation gate (`validateCompiledCommandsWithReport`) only
 * checks structure/props. This module adds *content quality* checks that catch
 * "ugly/silly page" problems: placeholder text, duplicate headings, white-on-
 * white contrast, non-responsive giant headings, empty sections, overlong
 * headings, and wrong-language headings (roadmap 02/03 locale).
 *
 * Pure/deterministic — no LLM calls. Runs in a few ms per section. A `block`
 * issue is treated by the generate-page route as a retryable section error
 * (retry-with-hint, then fallback pack); a `warn` streams alongside the section.
 */
import type { AICommandSuggestion, DesignTokens, PagePlan } from "../types/ai.types.js";

export type QualitySeverity = "block" | "warn";

export interface QualityIssue {
  code: string;
  severity: QualitySeverity;
  sectionId?: string;
  nodeId?: string;
  detail: string;
}

/** Gate mode. `off` disables all checks; `warn` downgrades every block to warn. */
export type QualityGateMode = "block" | "warn" | "off";

export function resolveGateMode(): QualityGateMode {
  const raw = process.env.AI_QUALITY_GATE?.toLowerCase();
  if (raw === "off" || raw === "warn" || raw === "block") return raw;
  return "block";
}

/** Codes disabled via `AI_QG_DISABLE=code1,code2` (operational escape hatch). */
function disabledCodes(): Set<string> {
  return new Set(
    (process.env.AI_QG_DISABLE ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// ── Text helpers ──────────────────────────────────────────────────────────

/** Strip HTML tags + decode the few entities the compiler emits. */
export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collect every user-visible text string from a command's props. */
function commandTexts(cmd: AICommandSuggestion): string[] {
  const props = (cmd.payload?.props ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["text", "label", "title", "caption", "heading", "eyebrow"]) {
    const t = plainText(props[key]);
    if (t) out.push(t);
  }
  // GalleryPro/items carry nested text.
  const items = props.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item === "object") {
        for (const t of ["title", "caption", "label"]) {
          const s = plainText((item as Record<string, unknown>)[t]);
          if (s) out.push(s);
        }
      }
    }
  }
  return out;
}

// ── Placeholder detection ─────────────────────────────────────────────────

// Strong patterns → block. Weak patterns → warn only (avoid false positives on
// real content like "XXX Steakhouse").
const STRONG_PLACEHOLDER =
  /lorem ipsum|your (headline|text|content|title|company|brand|business)\s+here|(headline|text|content|title)\s+goes here|tiêu đề của bạn|nội dung của bạn|placeholder text|insert (your )?(text|content|headline) here/i;
const WEAK_PLACEHOLDER = /\bTBD\b|\bTODO\b|\blorem\b|\bipsum\b|x{4,}|\[.*?\]|\{\{.*?\}\}/i;

// ── Contrast (WCAG) ───────────────────────────────────────────────────────

function parseColor(value: unknown): [number, number, number] | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null; // named colors, gradients, css vars → skip (don't guess)
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const chan = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** WCAG contrast ratio (1..21). Returns null if either color is unparseable. */
export function contrastRatio(fg: unknown, bg: unknown): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Language / script ─────────────────────────────────────────────────────

const VN_DIACRITICS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const CJK = /[぀-ヿ가-힯一-鿿]/;

/**
 * Heuristic: does this heading text plausibly match the requested locale?
 * Only flags a clear mismatch (VN locale but no diacritics AND long enough to
 * expect some; or non-VN locale with VN diacritics). Conservative to avoid
 * false positives on brand names / loanwords.
 */
function headingLanguageMismatch(text: string, locale: string): boolean {
  if (!text || text.length < 12) return false; // too short to judge
  const hasVn = VN_DIACRITICS.test(text);
  const hasCjk = CJK.test(text);
  if (locale === "vi") return !hasVn && !hasCjk; // expected VN, got none
  if (locale === "ja" || locale === "ko" || locale === "zh") return !hasCjk;
  // en / others: flag if it's clearly Vietnamese when English was requested.
  if (locale === "en") return hasVn;
  return false;
}

// ── Section structure helpers ─────────────────────────────────────────────

interface SectionScope {
  sectionId: string;
  /** node ids that belong to this section (section root + all descendants). */
  nodeIds: Set<string>;
  /** the ADD_NODE command for the Section skeleton, if present in this batch. */
  hasChildren: boolean;
}

/** Group commands by their owning Section (root at parentId "root"). */
function sectionScopes(commands: AICommandSuggestion[]): SectionScope[] {
  const scopes = new Map<string, SectionScope>();
  // First pass: find Section roots.
  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") continue;
    if (cmd.payload.componentType === "Section" && cmd.payload.parentId === "root") {
      const id = String(cmd.payload.nodeId);
      scopes.set(id, { sectionId: id, nodeIds: new Set([id]), hasChildren: false });
    }
  }
  // Second pass: attach descendants by walking parent chains (order-preserving).
  const parentOf = new Map<string, string>();
  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") continue;
    parentOf.set(String(cmd.payload.nodeId), String(cmd.payload.parentId));
  }
  const rootFor = (nodeId: string): string | null => {
    let cur = nodeId;
    for (let i = 0; i < 100; i++) {
      const parent = parentOf.get(cur);
      if (!parent) return null;
      if (scopes.has(parent)) return parent;
      if (parent === "root") return scopes.has(cur) ? cur : null;
      cur = parent;
    }
    return null;
  };
  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") continue;
    const nodeId = String(cmd.payload.nodeId);
    if (scopes.has(nodeId)) continue; // section root itself
    const root = rootFor(nodeId);
    if (root) {
      const scope = scopes.get(root)!;
      scope.nodeIds.add(nodeId);
      scope.hasChildren = true;
    }
  }
  return [...scopes.values()];
}

// ── Main gate ─────────────────────────────────────────────────────────────

export interface QualityGateOptions {
  /** Requested content locale (roadmap 02/03) — enables wrong_language check. */
  locale?: string;
  /** When true (fallback-pack path), block issues are downgraded to warn so a
   *  section is never left empty by a bad pack. */
  exemptBlock?: boolean;
  /** Headings already seen in this job — enables cross-section duplicate detection. */
  seenHeadings?: Map<string, string>;
}

/**
 * Run all enabled quality checks over one section's compiled commands. Returns
 * issues at their *raw* severity (before mode/exempt downgrade — see
 * {@link applyGateMode}).
 */
export function runQualityGate(
  commands: AICommandSuggestion[],
  tokens: DesignTokens,
  options: QualityGateOptions = {},
): QualityIssue[] {
  const disabled = disabledCodes();
  const issues: QualityIssue[] = [];
  const add = (i: QualityIssue) => {
    if (!disabled.has(i.code)) issues.push(i);
  };

  const scopes = sectionScopes(commands);
  const sectionBg = tokens.backgroundColor;

  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") continue;
    const nodeId = String(cmd.payload.nodeId ?? "");
    const props = (cmd.payload.props ?? {}) as Record<string, unknown>;
    const style = (cmd.payload.style ?? {}) as Record<string, unknown>;
    const responsive = (cmd.payload.responsiveStyle ?? {}) as Record<string, Record<string, unknown>>;
    const sectionId = scopes.find((s) => s.nodeIds.has(nodeId))?.sectionId;

    // placeholder_content
    for (const text of commandTexts(cmd)) {
      if (STRONG_PLACEHOLDER.test(text)) {
        add({ code: "placeholder_content", severity: "block", sectionId, nodeId, detail: `Placeholder text: "${text.slice(0, 60)}"` });
        break;
      }
      if (WEAK_PLACEHOLDER.test(text)) {
        add({ code: "placeholder_content", severity: "warn", sectionId, nodeId, detail: `Possible placeholder: "${text.slice(0, 60)}"` });
        break;
      }
    }

    // low_contrast (only when both colors parse to hex/rgb)
    const ratio = contrastRatio(style.color, style.backgroundColor ?? sectionBg);
    if (ratio !== null && ratio < 3.0) {
      add({ code: "low_contrast", severity: "warn", sectionId, nodeId, detail: `Contrast ratio ${ratio.toFixed(2)} (< 3.0)` });
    }

    // missing_mobile_font — big headings need a mobile size
    if (props.componentType === "Text" || cmd.payload.componentType === "Text") {
      const tag = String(props.tag ?? "");
      const fontSizePx = parsePx(style.fontSize);
      const hasMobileFont = responsive?.mobile?.fontSize != null || (cmd.payload.responsiveProps as Record<string, Record<string, unknown>>)?.mobile?.fontSize != null;
      if ((tag === "h1" || tag === "h2") && fontSizePx != null && fontSizePx > 40 && !hasMobileFont) {
        add({ code: "missing_mobile_font", severity: "warn", sectionId, nodeId, detail: `${tag} at ${fontSizePx}px has no mobile font size` });
      }
      // overlong_heading + wrong_language on headings
      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const heading = plainText(props.text);
        if (heading.length > 120) {
          add({ code: "overlong_heading", severity: "warn", sectionId, nodeId, detail: `Heading ${heading.length} chars (> 120)` });
        }
        if (options.locale && headingLanguageMismatch(heading, options.locale)) {
          add({ code: "wrong_language", severity: "warn", sectionId, nodeId, detail: `Heading may not be in "${options.locale}": "${heading.slice(0, 40)}"` });
        }
        // duplicate_heading across the job
        if (options.seenHeadings && (tag === "h1" || tag === "h2")) {
          const norm = heading.toLowerCase().replace(/\s+/g, " ").trim();
          if (norm.length >= 4) {
            const prev = options.seenHeadings.get(norm);
            if (prev && prev !== sectionId) {
              add({ code: "duplicate_heading", severity: "warn", sectionId, nodeId, detail: `Heading duplicates section "${prev}": "${heading.slice(0, 40)}"` });
            } else if (!prev) {
              options.seenHeadings.set(norm, sectionId ?? nodeId);
            }
          }
        }
      }
    }
  }

  // empty_section — a Section skeleton that received no children
  for (const scope of scopes) {
    if (!scope.hasChildren) {
      add({ code: "empty_section", severity: "block", sectionId: scope.sectionId, detail: "Section has no child content" });
    }
  }

  // exemptBlock: fallback pack must never leave a section empty.
  if (options.exemptBlock) {
    return issues.map((i) => (i.severity === "block" ? { ...i, severity: "warn" as const } : i));
  }
  return issues;
}

function parsePx(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d+(?:\.\d+)?)px$/);
  return m ? Number(m[1]) : null;
}

/**
 * Apply the configured gate mode. Returns the blocking issues (empty in
 * `warn`/`off` mode) and all warnings, so a caller can decide to retry vs stream.
 */
export function partitionByMode(
  issues: QualityIssue[],
  mode: QualityGateMode = resolveGateMode(),
): { blocking: QualityIssue[]; warnings: QualityIssue[] } {
  if (mode === "off") return { blocking: [], warnings: [] };
  const warnings = issues.filter((i) => i.severity === "warn");
  const blocking = mode === "block" ? issues.filter((i) => i.severity === "block") : [];
  if (mode === "warn") {
    // downgrade blocks to warnings so they still surface
    return { blocking: [], warnings: [...warnings, ...issues.filter((i) => i.severity === "block")] };
  }
  return { blocking, warnings };
}
