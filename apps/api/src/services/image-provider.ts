/**
 * Image Provider — context-aware images for AI generation (roadmap 02/06).
 *
 * The compiler previously cycled a fixed pool of 6 content-pack URLs. This module
 * lets a section fetch real images matching its `mediaPrompt` (e.g. "pet spa"
 * → pet-spa photos) from an external provider. It is a **best-effort
 * enhancement**: every failure mode (no key, timeout, rate limit, error) falls
 * back silently to the content-pack pool and never blocks a section.
 *
 * v1 provider: Unsplash (`UNSPLASH_ACCESS_KEY`). With no key the provider is
 * "none" → callers use the pool exactly as before. Pexels / image-generation are
 * future providers behind the same `ImageProvider` interface.
 */
import { safeMediaUrl } from "./url-guard.js";
import { logger } from "./logger.js";
import type { CreativeBrief, PagePlanSection, SectionPlan } from "../types/ai.types.js";

export interface ImageQuery {
  query: string;
  orientation?: "landscape" | "portrait" | "squarish";
  count: number;
}

export interface ImageResult {
  url: string;
  thumbUrl?: string;
  alt: string;
  credit?: { name: string; link: string };
}

export interface ImageProvider {
  readonly name: string;
  search(q: ImageQuery): Promise<ImageResult[]>;
}

// ── Query safety ───────────────────────────────────────────────────────────

// Short blocklist — strip clearly unsafe terms from the query before searching.
const BLOCKED_TERMS = /\b(nude|nsfw|porn|sexual|gore|violence|weapon|drugs?)\b/gi;

export function sanitizeImageQuery(raw: string): string {
  return raw.replace(BLOCKED_TERMS, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

// ── Cache (in-memory, TTL) ──────────────────────────────────────────────────

interface CacheEntry {
  results: ImageResult[];
  expires: number;
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const cache = new Map<string, CacheEntry>();

function cacheKey(q: ImageQuery): string {
  return `${q.orientation ?? "any"}:${q.count}:${q.query.toLowerCase()}`;
}

/** Test-only: clear the module cache and rate bucket. */
export function __resetImageProviderState(): void {
  cache.clear();
  bucketTokens = RATE_LIMIT;
  bucketResetAt = 0;
}

// ── Rate limit (simple token bucket) ────────────────────────────────────────

const RATE_LIMIT = Number(process.env.IMAGE_RATE_LIMIT) > 0 ? Number(process.env.IMAGE_RATE_LIMIT) : 45; // < Unsplash free 50/h
const RATE_WINDOW_MS = 60 * 60 * 1000;
let bucketTokens = RATE_LIMIT;
let bucketResetAt = 0;

function takeToken(): boolean {
  const now = Date.now();
  if (now >= bucketResetAt) {
    bucketTokens = RATE_LIMIT;
    bucketResetAt = now + RATE_WINDOW_MS;
  }
  if (bucketTokens <= 0) return false;
  bucketTokens -= 1;
  return true;
}

// ── Timeout fetch ───────────────────────────────────────────────────────────

function imageTimeoutMs(): number {
  const v = Number(process.env.IMAGE_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 3000;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Unsplash provider ───────────────────────────────────────────────────────

class UnsplashProvider implements ImageProvider {
  readonly name = "unsplash";
  constructor(private readonly accessKey: string) {}

  async search(q: ImageQuery): Promise<ImageResult[]> {
    const key = cacheKey(q);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.results;

    if (!takeToken()) {
      logger.decision("IMAGE_PROVIDER", "Rate limit hit — using pool", { query: q.query });
      return [];
    }

    const params = new URLSearchParams({
      query: q.query,
      per_page: String(Math.min(Math.max(q.count, 1), 10)),
      content_filter: "high",
    });
    if (q.orientation) params.set("orientation", q.orientation);

    let res: Response;
    try {
      res = await fetchWithTimeout(
        `https://api.unsplash.com/search/photos?${params.toString()}`,
        { headers: { Authorization: `Client-ID ${this.accessKey}`, "Accept-Version": "v1" } },
        imageTimeoutMs(),
      );
    } catch (err) {
      logger.decision("IMAGE_PROVIDER", "Search failed/timed out — using pool", {
        query: q.query,
        error: err instanceof Error ? err.name : String(err),
      });
      return [];
    }
    if (!res.ok) {
      logger.decision("IMAGE_PROVIDER", `Unsplash error ${res.status} — using pool`, { query: q.query });
      return [];
    }

    const data = (await res.json()) as {
      results?: Array<{
        urls?: { regular?: string; small?: string };
        alt_description?: string;
        description?: string;
        user?: { name?: string; links?: { html?: string } };
      }>;
    };
    const results: ImageResult[] = [];
    for (const photo of data.results ?? []) {
      const url = safeMediaUrl(photo.urls?.regular);
      if (!url) continue;
      results.push({
        url,
        thumbUrl: safeMediaUrl(photo.urls?.small) ?? undefined,
        alt: (photo.alt_description || photo.description || q.query).slice(0, 140),
        credit: photo.user?.name ? { name: photo.user.name, link: photo.user.links?.html ?? "https://unsplash.com" } : undefined,
      });
    }
    cache.set(key, { results, expires: Date.now() + CACHE_TTL_MS });
    return results;
  }
}

/** Provider that always returns nothing → callers fall back to the pool. */
class NoneProvider implements ImageProvider {
  readonly name = "none";
  async search(): Promise<ImageResult[]> {
    return [];
  }
}

let cachedProvider: ImageProvider | null = null;

/** Resolve the configured provider (memoized). */
export function getImageProvider(): ImageProvider {
  if (cachedProvider) return cachedProvider;
  const key = process.env.UNSPLASH_ACCESS_KEY;
  cachedProvider = key ? new UnsplashProvider(key) : new NoneProvider();
  return cachedProvider;
}

/** Test-only: override the provider (and reset cache/bucket). */
export function __setImageProvider(provider: ImageProvider | null): void {
  cachedProvider = provider;
  __resetImageProviderState();
}

// ── Section-level fetch ─────────────────────────────────────────────────────

/** Max images a section could use — bounds the provider `count`. */
function sectionImageCount(sectionType: string): number {
  switch (sectionType) {
    case "gallery":
      return 6;
    case "services":
    case "features":
      return 4;
    case "testimonials":
      return 3;
    case "hero":
      return 2;
    default:
      return 1;
  }
}

export interface SectionImages {
  results: ImageResult[];
  /** Provider name that produced them (or "none"). */
  provider: string;
}

/**
 * Fetch context-aware images for one section. Query is `mediaPrompt` (the LLM is
 * asked to write it in English) or `"{industry} {sectionType}"`. Always resolves
 * — returns an empty result set on any failure so the compiler uses the pool.
 */
export async function fetchSectionImages(
  plan: SectionPlan,
  section: PagePlanSection,
  brief: CreativeBrief,
): Promise<SectionImages> {
  const provider = getImageProvider();
  if (provider.name === "none") return { results: [], provider: "none" };

  const rawQuery = plan.mediaPrompt?.trim() || `${brief.inferredIndustry || ""} ${section.type}`.trim();
  const query = sanitizeImageQuery(rawQuery);
  if (!query) return { results: [], provider: provider.name };

  const orientation = section.type === "hero" || section.type === "cta" ? "landscape" : undefined;
  try {
    const results = await provider.search({ query, orientation, count: sectionImageCount(section.type) });
    return { results, provider: provider.name };
  } catch {
    return { results: [], provider: provider.name };
  }
}
