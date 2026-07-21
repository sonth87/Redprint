/**
 * Preset Catalog — resolve & instantiate designer-authored presets during AI
 * compile (roadmap 02/01, phase 1: leaf presets + heuristic).
 *
 * The client already sends `availablePresets` (full props/style per preset) in
 * the generate-page request, but nothing used it. This module turns that catalog
 * into an index the compiler can query — either by an id the LLM referenced
 * (`SectionPlan.presetRefs`) or by a heuristic (componentType + tag match) — so
 * generated pages reuse real designed presets instead of only the ~10 hardcoded
 * `xxxCommand()` styles. Falls back to the old adapters when no preset matches.
 *
 * Phase 1 scope: LEAF components only (Text / Button / Image). Container/card
 * presets (multi-child content patching) are deferred. Gated by `AI_PRESET_FIRST`.
 */
import type { AICommandSuggestion, AIPresetGroup, AIPresetItem, DesignTokens } from "../types/ai.types.js";
import { safeMediaUrl } from "./url-guard.js";

/** Whether preset-first compilation is enabled (default on; env off-switch). */
export function presetFirstEnabled(): boolean {
  return process.env.AI_PRESET_FIRST !== "false";
}

export interface PresetIndex {
  /** All presets by id. */
  byId: Map<string, AIPresetItem>;
  /** Preset ids grouped by componentType, in catalog order. */
  byComponentType: Map<string, AIPresetItem[]>;
  size: number;
}

/**
 * Flatten the nested `AIPresetGroup[]` catalog into lookup maps. Presets whose
 * `componentType` isn't in the available registry are dropped (catalog can drift
 * from the registry). Malformed entries (no id/componentType) are skipped.
 */
export function buildPresetIndex(
  groups: AIPresetGroup[] | undefined,
  availableTypes: Set<string>,
): PresetIndex {
  const byId = new Map<string, AIPresetItem>();
  const byComponentType = new Map<string, AIPresetItem[]>();
  if (!groups) return { byId, byComponentType, size: 0 };

  for (const group of groups) {
    for (const type of group.types ?? []) {
      for (const item of type.items ?? []) {
        if (!item?.id || !item.componentType) continue;
        if (availableTypes.size > 0 && !availableTypes.has(item.componentType)) continue;
        if (byId.has(item.id)) continue; // first wins on duplicate id
        byId.set(item.id, item);
        const list = byComponentType.get(item.componentType) ?? [];
        list.push(item);
        byComponentType.set(item.componentType, list);
      }
    }
  }
  return { byId, byComponentType, size: byId.size };
}

/** Resolve a preset the LLM referenced by id. Returns null if it doesn't exist. */
export function resolvePresetById(index: PresetIndex, presetId: string | undefined): AIPresetItem | null {
  if (!presetId) return null;
  return index.byId.get(presetId) ?? null;
}

/**
 * Heuristic preset pick when the LLM didn't reference one: first preset of the
 * right componentType whose tags include any of `preferredTags`. `seed` rotates
 * the choice so the same prompt can yield a different (but deterministic)
 * variant across runs. Returns null when nothing matches.
 */
export function resolvePresetByHeuristic(
  index: PresetIndex,
  componentType: string,
  preferredTags: string[],
  seed = 0,
): AIPresetItem | null {
  const candidates = index.byComponentType.get(componentType);
  if (!candidates || candidates.length === 0) return null;

  const tagSet = new Set(preferredTags.map((t) => t.toLowerCase()));
  const matching =
    tagSet.size === 0
      ? candidates
      : candidates.filter((p) => (p.tags ?? []).some((t) => tagSet.has(t.toLowerCase())));
  const pool = matching.length > 0 ? matching : [];
  if (pool.length === 0) return null;
  // Deterministic rotation by seed for controlled variety.
  return pool[((seed % pool.length) + pool.length) % pool.length]!;
}

/** True if a preset opts into design-token theming via the `themable` tag. */
function isThemable(preset: AIPresetItem): boolean {
  return (preset.tags ?? []).some((t) => t.toLowerCase() === "themable");
}

/** Design-token color overrides applied to a themable preset's style. */
function themeOverrides(tokens: DesignTokens): Record<string, string> {
  const out: Record<string, string> = {};
  if (tokens.primaryColor) out.backgroundColor = tokens.primaryColor;
  if (tokens.textColor) out.color = tokens.textColor;
  if (tokens.accentColor) out.borderColor = tokens.accentColor;
  if (tokens.borderRadius) out.borderRadius = tokens.borderRadius;
  return out;
}

/** Content overrides to patch onto a preset's props (text/label/src). */
export interface PresetContentPatch {
  props?: Record<string, unknown>;
}

/**
 * Instantiate a preset into an ADD_NODE command. Content patch (text/label/src)
 * overrides the preset's props; image `src` is sanitized. Themable presets get
 * design-token color overrides on style; non-themable presets keep their style
 * exactly (respect the designer's intent). Still passes the validation gate as a
 * normal ADD_NODE downstream.
 */
export function presetCommand(
  nodeId: string,
  parentId: string,
  preset: AIPresetItem,
  patch: PresetContentPatch,
  tokens: DesignTokens,
): AICommandSuggestion {
  const patchedProps: Record<string, unknown> = { ...preset.props, ...(patch.props ?? {}) };

  // Sanitize any image src (preset or patched) through the media guard.
  if (typeof patchedProps.src === "string") {
    patchedProps.src = safeMediaUrl(patchedProps.src) ?? preset.props.src ?? patchedProps.src;
  }

  const style = isThemable(preset)
    ? { ...(preset.style ?? {}), ...themeOverrides(tokens) }
    : { ...(preset.style ?? {}) };

  return {
    type: "ADD_NODE",
    payload: {
      nodeId,
      componentType: preset.componentType,
      parentId,
      props: patchedProps,
      style,
      presetId: preset.id,
    },
    description: `Add ${preset.componentType} from preset ${preset.id}`,
  };
}
