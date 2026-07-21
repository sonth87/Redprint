import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchSectionImages,
  sanitizeImageQuery,
  getImageProvider,
  __setImageProvider,
  __resetImageProviderState,
  type ImageProvider,
  type ImageResult,
} from "./image-provider.js";
import type { CreativeBrief, PagePlanSection, SectionPlan } from "../types/ai.types.js";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  __setImageProvider(null); // reset to env-resolved provider + clear cache/bucket
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function brief(): CreativeBrief {
  return { rawPrompt: "", inferredIndustry: "pet care", inferredPageType: "landing", primaryGoal: "collect_leads", targetAudience: "owners", tone: "friendly", styleDirection: "clean", assumedBusinessDetails: [], requiredContentAreas: [] } as CreativeBrief;
}
function section(type: string): PagePlanSection {
  return { id: `sec-${type}`, type, index: 0, title: type, purpose: "", priority: "required", layoutIntent: "", contentRequirements: [] } as PagePlanSection;
}
function plan(mediaPrompt?: string): SectionPlan {
  return { sectionId: "sec-hero", type: "hero", heading: "h", body: "b", items: [], mediaPrompt } as SectionPlan;
}

describe("sanitizeImageQuery", () => {
  it("strips blocked terms and trims", () => {
    expect(sanitizeImageQuery("cute dog nsfw spa")).toBe("cute dog spa");
    expect(sanitizeImageQuery("  a   b  ")).toBe("a b");
  });
});

describe("getImageProvider", () => {
  it("is 'none' without an access key", () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    __setImageProvider(null);
    expect(getImageProvider().name).toBe("none");
  });
});

describe("fetchSectionImages", () => {
  it("returns empty (pool) for the none provider", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    __setImageProvider(null);
    const out = await fetchSectionImages(plan("dogs"), section("hero"), brief());
    expect(out.provider).toBe("none");
    expect(out.results).toHaveLength(0);
  });

  it("uses mediaPrompt as the query and returns provider results", async () => {
    let seenQuery = "";
    const mock: ImageProvider = {
      name: "mock",
      async search(q) {
        seenQuery = q.query;
        return [{ url: "https://images.example.com/a.jpg", alt: "a" }];
      },
    };
    __setImageProvider(mock);
    const out = await fetchSectionImages(plan("happy dog in pet spa"), section("hero"), brief());
    expect(seenQuery).toBe("happy dog in pet spa");
    expect(out.results[0]!.url).toBe("https://images.example.com/a.jpg");
  });

  it("falls back to '{industry} {type}' when mediaPrompt is absent", async () => {
    let seenQuery = "";
    __setImageProvider({ name: "mock", async search(q) { seenQuery = q.query; return []; } });
    await fetchSectionImages(plan(), section("services"), brief());
    expect(seenQuery).toBe("pet care services");
  });

  it("resolves empty on a provider that throws (never blocks the section)", async () => {
    __setImageProvider({ name: "mock", async search() { throw new Error("boom"); } });
    const out = await fetchSectionImages(plan("x"), section("hero"), brief());
    expect(out.results).toHaveLength(0);
  });
});

describe("Unsplash provider (via mocked fetch)", () => {
  function setUnsplash() {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    __setImageProvider(null); // re-resolve → UnsplashProvider
  }

  it("maps results, honors content_filter, and caches (no 2nd fetch)", async () => {
    setUnsplash();
    const fetchMock = vi.fn(async (url: string) => {
      expect(String(url)).toContain("content_filter=high");
      return {
        ok: true,
        json: async () => ({
          results: [
            { urls: { regular: "https://images.unsplash.com/x.jpg", small: "https://images.unsplash.com/x-s.jpg" }, alt_description: "a dog", user: { name: "Jane", links: { html: "https://unsplash.com/@jane" } } },
          ],
        }),
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const q = { query: "dogs", count: 2 } as const;
    const provider = getImageProvider();
    const first = await provider.search(q);
    const second = await provider.search(q); // served from cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first[0]!.url).toBe("https://images.unsplash.com/x.jpg");
    expect(first[0]!.credit?.name).toBe("Jane");
    expect(second).toEqual(first);
  });

  it("returns [] on a non-ok response (→ pool)", async () => {
    setUnsplash();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }) as unknown as Response));
    expect(await getImageProvider().search({ query: "cats", count: 1 })).toHaveLength(0);
  });

  it("returns [] when fetch aborts/times out (→ pool)", async () => {
    setUnsplash();
    vi.stubGlobal("fetch", vi.fn(async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); }));
    expect(await getImageProvider().search({ query: "cats", count: 1 })).toHaveLength(0);
  });

  it("drops unsafe (private-host) urls from results", async () => {
    setUnsplash();
    __resetImageProviderState();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ urls: { regular: "http://169.254.169.254/x.jpg" }, alt_description: "ssrf" }] }),
    }) as unknown as Response));
    expect(await getImageProvider().search({ query: "unique-query-ssrf", count: 1 })).toHaveLength(0);
  });
});
