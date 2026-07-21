/**
 * Generic Adapter — compile ANY component from its `aiHints.contentSlots`
 * (roadmap 03/02, depends on 03/01's aiHints).
 *
 * Before this, a component only rendered real AI content if the compiler had a
 * hand-written adapter function for its exact type. A brand-new component
 * (third-party or freshly added) was invisible to `componentIntents` even
 * though the LLM could choose it — it silently fell back to a generic card.
 *
 * This module maps section content (heading/body/ctaLabel/items/media) onto a
 * component's props using the content→prop mapping the component itself
 * declares (`ComponentAIHints.contentSlots`), then validates through the
 * existing contract-based validator. It is intentionally minimal: it maps
 * content, not layout or style — visual polish comes from a matched preset
 * (roadmap 02/01) or the component's own `defaultProps`/`defaultStyle`, not
 * from this adapter inventing style.
 */
import type { AICommandSuggestion, DesignTokens, SectionPlanItem } from "../types/ai.types.js";
import type { ComponentContract } from "./component-contract-resolver.js";
import { validatePropsAgainstContract } from "./prop-schema-validator.js";

/** Mirrors ComponentAIHints.contentSlots (server-side wire shape, roadmap 03/01). */
export interface ContentSlots {
  heading?: string;
  body?: string;
  items?: {
    prop: string;
    shape: "array-of-objects" | "indexed-props";
    itemKeys?: Record<string, string>;
    maxItems?: number;
  };
  mediaSrc?: string;
  mediaAlt?: string;
  ctaLabel?: string;
  href?: string;
}

export interface GenericAdapterContent {
  heading?: string;
  body?: string;
  ctaLabel?: string;
  href?: string;
  items?: SectionPlanItem[];
  media?: { src: string; alt: string }[];
}

export interface GenericAdapterInput {
  id: string;
  parentId: string;
  componentType: string;
  contract: ComponentContract;
  contentSlots: ContentSlots | undefined;
  content: GenericAdapterContent;
  tokens: DesignTokens;
}

const DEFAULT_MAX_ITEMS = 6;

/** Whether the generic adapter (roadmap 03/02) runs at all. Default on. */
export function genericAdapterEnabled(): boolean {
  return process.env.AI_GENERIC_ADAPTER !== "false";
}

/** Map one `SectionPlanItem` onto an indexed-props item (e.g. `slide0_title`). */
function mapIndexedItem(target: Record<string, unknown>, prefix: string, item: SectionPlanItem, itemKeys: Record<string, string> | undefined) {
  const titleKey = itemKeys?.title ?? "title";
  const bodyKey = itemKeys?.body ?? "body";
  target[`${prefix}${titleKey}`] = item.title;
  target[`${prefix}${bodyKey}`] = item.body;
  if (item.meta && itemKeys?.meta) target[`${prefix}${itemKeys.meta}`] = item.meta;
}

/** Map a SectionPlanItem array onto props per `contentSlots.items` (either shape). */
function applyItemsSlot(props: Record<string, unknown>, slot: NonNullable<ContentSlots["items"]>, items: SectionPlanItem[]) {
  const capped = items.slice(0, slot.maxItems ?? DEFAULT_MAX_ITEMS);
  if (slot.shape === "array-of-objects") {
    const keys = slot.itemKeys ?? {};
    props[slot.prop] = capped.map((item) => {
      const obj: Record<string, unknown> = {};
      obj[keys.title ?? "title"] = item.title;
      obj[keys.body ?? "body"] = item.body;
      if (item.meta && keys.meta) obj[keys.meta] = item.meta;
      return obj;
    });
    return;
  }
  // indexed-props: e.g. slide0_title, slide1_title, ... on the top-level props object.
  capped.forEach((item, index) => {
    mapIndexedItem(props, `${slot.prop}${index}_`, item, slot.itemKeys);
  });
}

/**
 * Build props for `componentType` from section content, via its declared
 * `contentSlots`. A content field with no matching slot is skipped — never
 * guessed onto an unrelated prop. Exported so the preset-first path (roadmap
 * 02/01) can reuse the same mapping when patching content onto a preset that
 * declares contentSlots, instead of duplicating the logic.
 */
export function mapContentToProps(contentSlots: ContentSlots | undefined, content: GenericAdapterContent): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (!contentSlots) return props;

  if (contentSlots.heading && content.heading) props[contentSlots.heading] = content.heading;
  if (contentSlots.body && content.body) props[contentSlots.body] = content.body;
  if (contentSlots.ctaLabel && content.ctaLabel) props[contentSlots.ctaLabel] = content.ctaLabel;
  if (contentSlots.href && content.href) props[contentSlots.href] = content.href;
  if (contentSlots.mediaSrc && content.media?.[0]) props[contentSlots.mediaSrc] = content.media[0].src;
  if (contentSlots.mediaAlt && content.media?.[0]) props[contentSlots.mediaAlt] = content.media[0].alt;
  if (contentSlots.items && content.items?.length) applyItemsSlot(props, contentSlots.items, content.items);

  return props;
}

/**
 * Compile a single component instance purely from its content-slot mapping.
 * Returns `null` when the contract still fails validation after repair (the
 * caller should fall through to a preset/handwritten adapter or drop the
 * intent) — a missing/broken node is never emitted as a "close enough" guess.
 */
export function compileGenericComponent(input: GenericAdapterInput): AICommandSuggestion | null {
  const { id, parentId, componentType, contract, contentSlots, content, tokens } = input;

  const mappedProps = mapContentToProps(contentSlots, content);
  const props = { ...contract.defaultProps, ...mappedProps };

  const validation = validatePropsAgainstContract(contract, props);
  if (!validation.valid) return null;

  return {
    type: "ADD_NODE",
    payload: {
      nodeId: id,
      componentType,
      parentId,
      props: validation.repairedProps,
      // Minimal, content-agnostic style only — visual identity comes from the
      // component's own defaultStyle or a matched preset, not this adapter.
      style: { width: "100%", borderRadius: tokens.borderRadius ?? "12px" },
    },
    description: `Add ${componentType} via generic adapter`,
  };
}
