import {
  buildComponentCapabilityManifest,
  type ComponentCapability,
} from "./component-capability-manifest.js";
import type { AIComponentHints, AIPropSchemaEntry, GeneratePageRequest } from "../types/ai.types.js";

type AvailableComponent = GeneratePageRequest["availableComponents"][number];

export interface PropContract {
  key: string;
  label: string;
  type: string;
  required: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multiple?: boolean;
}

export interface ComponentContract {
  type: string;
  name: string;
  category: string;
  canContainChildren: boolean;
  requiredProps: PropContract[];
  optionalProps: PropContract[];
  defaultProps: Record<string, unknown>;
  variants: string[];
  constraints: string[];
  fallbackTo: string[];
  examples: string[];
  contractSource: "propSchema" | "curated" | "merged" | "aiHints";
  /** Content-intent → prop mapping, from aiHints (roadmap 03/01/03/02). */
  contentSlots?: AIComponentHints["contentSlots"];
}

function flattenPropSchema(schema: AIPropSchemaEntry[] | undefined): AIPropSchemaEntry[] {
  const out: AIPropSchemaEntry[] = [];
  const visit = (entries: AIPropSchemaEntry[]) => {
    for (const entry of entries) {
      if (entry.children?.length) {
        visit(entry.children);
      } else {
        out.push(entry);
      }
    }
  };
  visit(schema ?? []);
  return out;
}

function propContract(entry: AIPropSchemaEntry, capability: ComponentCapability): PropContract {
  return {
    key: entry.key,
    label: entry.label,
    type: entry.type,
    required: Boolean(entry.required || capability.requiredProps.includes(entry.key)),
    default: entry.default,
    options: entry.options,
    min: entry.min,
    max: entry.max,
    step: entry.step,
    unit: entry.unit,
    multiple: entry.multiple,
  };
}

function inferConstraints(component: AvailableComponent, capability: ComponentCapability): string[] {
  const constraints = [
    capability.isContainer ? "container component; children may be allowed" : "leaf component; do not add children",
    "AI should return intent only; compiler owns final props and commands",
  ];
  if (component.category === "layout") constraints.push("use only inside Section or another container");
  if (component.category !== "layout") constraints.push("do not place directly under root");
  if (capability.fallbackTo.length > 0) constraints.push(`fallback chain: ${capability.fallbackTo.join(" -> ")}`);
  return constraints;
}

const CURATED_EXAMPLES: Record<string, string[]> = {
  NavigationMenu: ["header navigation with anchor targets, page links, and optional submenu children"],
  GalleryPro: ["service showcase gallery using mediaItems and collage or slider variant"],
  CollapsibleText: ["FAQ answer rendered as expandable rich text"],
  TextMask: ["playful hero heading with gradient-filled text"],
  TextMarquee: ["announcement or proof ticker in hero/CTA"],
};

/**
 * Usage examples for a component's prompt contract. Priority (roadmap 03/01):
 * the component's own `aiHints.examples` > the small curated table above
 * (kept for built-ins that haven't declared examples yet) > none.
 */
function examplesFor(type: string, component: AvailableComponent): string[] {
  if (component.aiHints?.examples?.length) return component.aiHints.examples;
  return CURATED_EXAMPLES[type] ?? [];
}

export function resolveComponentContracts(
  availableComponents: AvailableComponent[],
  componentTypes: string[],
): ComponentContract[] {
  const availableByType = new Map(availableComponents.map((component) => [component.type, component]));
  const capabilityByType = new Map(buildComponentCapabilityManifest(availableComponents).map((capability) => [capability.type, capability]));
  const uniqueTypes = Array.from(new Set(componentTypes));
  const contracts: ComponentContract[] = [];

  for (const type of uniqueTypes) {
    const component = availableByType.get(type);
    const capability = capabilityByType.get(type);
    if (!component || !capability) continue;

    const props = flattenPropSchema(component.propSchema).map((entry) => propContract(entry, capability));
    const explicitRequired = new Set(capability.requiredProps);
    const requiredProps = props.filter((prop) => prop.required || explicitRequired.has(prop.key));
    const optionalProps = props.filter((prop) => !requiredProps.some((required) => required.key === prop.key));

    contracts.push({
      type,
      name: component.name,
      category: component.category,
      canContainChildren: capability.isContainer ?? false,
      requiredProps,
      optionalProps,
      defaultProps: component.defaultProps ?? {},
      variants: capability.variants,
      constraints: inferConstraints(component, capability),
      fallbackTo: capability.fallbackTo,
      examples: examplesFor(type, component),
      contractSource: capability.contractSource ?? "propSchema",
      contentSlots: component.aiHints?.contentSlots,
    });
  }

  return contracts;
}

export function formatComponentContractsForPrompt(contracts: ComponentContract[]): string {
  if (contracts.length === 0) return "No detailed component contracts were selected for this section.";

  return contracts
    .map((contract) => {
      const required = contract.requiredProps.map((prop) => `${prop.key}:${prop.type}`).join(", ") || "none";
      const optional = contract.optionalProps
        .slice(0, 10)
        .map((prop) => {
          const options = prop.options?.length ? `[${prop.options.map((option) => option.value).join("|")}]` : "";
          return `${prop.key}:${prop.type}${options}`;
        })
        .join(", ") || "none";
      return [
        `- ${contract.type} (${contract.contractSource})`,
        `required: ${required}`,
        `optional: ${optional}`,
        `variants: ${contract.variants.join(", ") || "none"}`,
        `constraints: ${contract.constraints.join("; ")}`,
        `examples: ${contract.examples.join("; ") || "none"}`,
      ].join(" | ");
    })
    .join("\n");
}

const BY_SECTION_HARDCODE: Record<string, string[]> = {
  header: ["NavigationMenu", "Row", "Text", "Button"],
  hero: ["TextMask", "TextMarquee", "Image", "Shape", "Grid", "Column"],
  services: ["GalleryPro", "GalleryGrid", "Grid", "Image", "Text", "Button"],
  gallery: ["GalleryPro", "GallerySlider", "GalleryGrid", "Grid", "Image"],
  testimonials: ["GalleryPro", "GallerySlider", "Grid", "Text"],
  faq: ["CollapsibleText", "Grid", "Text"],
  cta: ["TextMarquee", "Image", "Button", "Text"],
  footer: ["NavigationMenu", "Divider", "Grid", "Text"],
};
const DEFAULT_CANDIDATES = ["Grid", "Text", "Button", "Image"];

/**
 * Candidate component types offered to the LLM for a section (roadmap 03/01).
 * Union of the legacy hardcoded map (kept during migration) and any available
 * component whose `aiHints.sectionAffinity` lists this section type — so a new
 * component self-nominates for the sections it's good for without a server edit.
 * Order: hardcode/default first (proven picks), then self-nominated extras.
 */
export function candidateComponentsForSection(sectionType: string, availableComponents: AvailableComponent[]): string[] {
  const available = new Set(availableComponents.map((component) => component.type));
  const base = BY_SECTION_HARDCODE[sectionType] ?? DEFAULT_CANDIDATES;

  const selfNominated = availableComponents
    .filter((component) => component.aiHints?.sectionAffinity?.includes(sectionType))
    .map((component) => component.type);

  const merged = Array.from(new Set([...base, ...selfNominated]));
  return merged.filter((type) => available.has(type));
}
