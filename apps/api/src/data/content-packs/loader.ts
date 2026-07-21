/**
 * Content Pack Loader — industry-specific fallback content for AI generation.
 *
 * When the LLM fails to produce a valid section plan, the compiler falls back to
 * deterministic content. Instead of hardcoding one demo brand ("PawJoy pet
 * care") in the compiler, that content now lives in data-driven **content
 * packs** — one JSON file per industry. Adding an industry = adding a JSON file
 * + one line in `index.json`, no TypeScript change. (Roadmap 02/02.)
 *
 * Packs are loaded and validated once at module init (sync, like the palette
 * loader). A pack that fails schema validation is skipped with a warning rather
 * than crashing the server; the `_generic` pack is the guaranteed fallback and
 * fills any section a matched pack omits (shallow per-section merge).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type {
  CreativeBrief,
  PageSectionType,
  SectionPlanItem,
  SectionPlanNavItem,
} from "../../types/ai.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Locale ──────────────────────────────────────────────────────────────
// Locale codes used as keys in a pack's `locales` map. `_default` is the
// required baseline (English) used when a requested locale is absent. The
// end-to-end locale mechanism is owned by roadmap 02/03; this loader only needs
// to resolve a pack's content for a given code with `_default` fallback.
export const PACK_DEFAULT_LOCALE = "_default";

// ── Zod schema ──────────────────────────────────────────────────────────

const ItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  meta: z.string().optional(),
});

const SectionContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  body: z.string().optional(),
  ctaLabel: z.string().optional(),
  secondaryCtaLabel: z.string().optional(),
  mediaPrompt: z.string().optional(),
  items: z.array(ItemSchema).optional(),
  faqs: z.array(ItemSchema).optional(),
  testimonials: z.array(ItemSchema).optional(),
  /** Per-item captions (e.g. services grid: one caption per card). */
  mediaCaptions: z.array(z.string()).optional(),
  /** Single caption applied to every media item in the section (e.g. testimonials). */
  mediaCaption: z.string().optional(),
  /** Alt-text stem; the compiler appends an index. */
  mediaAlt: z.string().optional(),
});

const NavItemSchema = z.object({ label: z.string().min(1), href: z.string().min(1) });

const LocaleContentSchema = z.object({
  brandPlaceholder: z.string().min(1),
  navItems: z.array(NavItemSchema).default([]),
  navLabels: z.record(z.string()).default({}),
  sections: z.record(SectionContentSchema).default({}),
  /** Decorative marquee strings by kind (`hero` / `cta`). */
  marquee: z.record(z.string()).default({}),
});

const ContentPackSchema = z.object({
  id: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  imagePool: z.array(z.string().url()).min(1),
  /** Optional accent shape for hero media (was hardcoded `isPetCare ? heart : blob`). */
  accentShape: z.string().optional(),
  locales: z.record(LocaleContentSchema),
});

export type PackSectionContent = z.infer<typeof SectionContentSchema>;
export type PackLocaleContent = z.infer<typeof LocaleContentSchema>;
export type ContentPack = z.infer<typeof ContentPackSchema>;

const IndexSchema = z.object({
  packs: z.array(z.string().min(1)),
});

// ── Loading ─────────────────────────────────────────────────────────────

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf-8"));
}

interface LoadedPacks {
  byId: Map<string, ContentPack>;
  generic: ContentPack;
  ordered: ContentPack[];
}

let cache: LoadedPacks | null = null;

function loadPacks(): LoadedPacks {
  if (cache) return cache;

  const index = IndexSchema.parse(readJson("index.json"));
  const byId = new Map<string, ContentPack>();
  const seenKeywords = new Map<string, string>();

  for (const packId of index.packs) {
    try {
      const parsed = ContentPackSchema.parse(readJson(`${packId}.json`));
      if (!parsed.locales[PACK_DEFAULT_LOCALE]) {
        console.warn(`[content-packs] pack "${packId}" has no "${PACK_DEFAULT_LOCALE}" locale — skipping`);
        continue;
      }
      for (const kw of parsed.keywords) {
        const prev = seenKeywords.get(kw);
        if (prev && prev !== parsed.id) {
          console.warn(`[content-packs] keyword "${kw}" claimed by both "${prev}" and "${parsed.id}"`);
        }
        seenKeywords.set(kw, parsed.id);
      }
      byId.set(parsed.id, parsed);
    } catch (err) {
      console.warn(`[content-packs] failed to load pack "${packId}":`, err instanceof Error ? err.message : err);
    }
  }

  const generic = byId.get("_generic");
  if (!generic) {
    throw new Error('[content-packs] required "_generic" pack is missing or invalid');
  }

  cache = { byId, generic, ordered: [...byId.values()] };
  if (process.env.AI_DEBUG === "true") {
    console.log(`[content-packs] loaded ${byId.size} packs: ${[...byId.keys()].join(", ")}`);
  }
  return cache;
}

// ── Matching ────────────────────────────────────────────────────────────

/**
 * Choose the best content pack for a brief. Scores each pack's keywords against
 * the prompt + inferred industry + audience; earlier keyword position in the
 * prompt breaks ties. Falls back to `_generic` when nothing scores.
 */
export function matchContentPack(brief: CreativeBrief): ContentPack {
  const { byId, generic } = loadPacks();
  const haystack = `${brief.rawPrompt} ${brief.inferredIndustry} ${brief.targetAudience}`.toLowerCase();

  let best: { pack: ContentPack; score: number; firstAt: number } | null = null;
  for (const pack of byId.values()) {
    if (pack.id === "_generic") continue;
    let score = 0;
    let firstAt = Number.MAX_SAFE_INTEGER;
    for (const kw of pack.keywords) {
      const at = haystack.indexOf(kw.toLowerCase());
      if (at !== -1) {
        score += 1;
        if (at < firstAt) firstAt = at;
      }
    }
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && firstAt < best.firstAt)) {
      best = { pack, score, firstAt };
    }
  }

  return best?.pack ?? generic;
}

/** Resolve a pack's locale content, falling back to `_default`. */
export function packLocale(pack: ContentPack, locale: string): PackLocaleContent {
  return pack.locales[locale] ?? pack.locales[PACK_DEFAULT_LOCALE];
}

/**
 * Section content for a pack+locale+section, merged over `_generic` so a pack
 * that omits a section still yields complete content (shallow field merge).
 */
export function packSection(
  pack: ContentPack,
  locale: string,
  sectionType: PageSectionType,
): PackSectionContent {
  const { generic } = loadPacks();
  const genericContent = packLocale(generic, locale).sections[sectionType] ?? {};
  const packContent = packLocale(pack, locale).sections[sectionType] ?? {};
  return { ...genericContent, ...packContent };
}

/** Nav items for a pack+locale (empty array if none authored). */
export function packNavItems(pack: ContentPack, locale: string): SectionPlanNavItem[] {
  return packLocale(pack, locale).navItems;
}

/** Localized nav label for a section type, from the pack (then generic). */
export function packNavLabel(pack: ContentPack, locale: string, sectionType: string): string | undefined {
  const { generic } = loadPacks();
  return (
    packLocale(pack, locale).navLabels[sectionType] ??
    packLocale(generic, locale).navLabels[sectionType]
  );
}

/** Decorative marquee string for a pack+locale+kind (`hero`/`cta`), pack then generic. */
export function packMarquee(pack: ContentPack, locale: string, kind: string): string | undefined {
  const { generic } = loadPacks();
  return packLocale(pack, locale).marquee[kind] ?? packLocale(generic, locale).marquee[kind];
}

/** Accent shape for hero media (pack override, else generic, else "blob"). */
export function packAccentShape(pack: ContentPack): string {
  const { generic } = loadPacks();
  return pack.accentShape ?? generic.accentShape ?? "blob";
}

export type { SectionPlanItem };

/** Test-only: reset the module cache so tests can reload packs. */
export function __resetContentPackCache(): void {
  cache = null;
}
