import { describe, expect, it } from "vitest";
import {
  matchContentPack,
  packLocale,
  packSection,
  PACK_DEFAULT_LOCALE,
} from "./loader.js";
import type { CreativeBrief } from "../../types/ai.types.js";

function brief(overrides: Partial<CreativeBrief> = {}): CreativeBrief {
  return {
    rawPrompt: "",
    inferredIndustry: "",
    inferredPageType: "landing page",
    primaryGoal: "collect_leads",
    targetAudience: "general audience",
    tone: "friendly",
    styleDirection: "clean",
    assumedBusinessDetails: [],
    requiredContentAreas: [],
    ...overrides,
  } as CreativeBrief;
}

describe("content-pack matcher (roadmap 02/02)", () => {
  it("matches the pet-care pack for a pet prompt", () => {
    expect(matchContentPack(brief({ rawPrompt: "trang cho tiệm chăm sóc thú cưng" })).id).toBe("pet-care");
  });

  it("matches the saas pack for a software prompt", () => {
    expect(matchContentPack(brief({ rawPrompt: "a landing page for our B2B SaaS platform" })).id).toBe("saas");
  });

  it("matches the restaurant pack for a cafe prompt", () => {
    expect(matchContentPack(brief({ rawPrompt: "trang cho quán cà phê nhỏ" })).id).toBe("restaurant");
  });

  it("falls back to _generic when nothing matches", () => {
    expect(matchContentPack(brief({ rawPrompt: "a page for my accounting firm" })).id).toBe("_generic");
  });
});

describe("content-pack schema completeness", () => {
  it("every pack has a _default locale with a brand placeholder", () => {
    for (const id of ["_generic", "pet-care", "saas", "restaurant"]) {
      const pack = matchContentPack(brief({ rawPrompt: id === "_generic" ? "" : id.replace("-", " ") }));
      // Not asserting exact match id here; just that _default resolves.
      expect(packLocale(pack, PACK_DEFAULT_LOCALE).brandPlaceholder.length).toBeGreaterThan(0);
    }
  });

  it("_generic provides items/faqs for the core section types", () => {
    const generic = matchContentPack(brief({ rawPrompt: "" }));
    expect(generic.id).toBe("_generic");
    expect(packSection(generic, PACK_DEFAULT_LOCALE, "services").items?.length).toBeGreaterThan(0);
    expect(packSection(generic, PACK_DEFAULT_LOCALE, "pricing").items?.length).toBeGreaterThan(0);
    expect(packSection(generic, PACK_DEFAULT_LOCALE, "faq").faqs?.length).toBeGreaterThan(0);
  });
});

describe("section merge over _generic", () => {
  it("a pack that omits a section still yields content from _generic", () => {
    // saas has no "trust" section; packSection must fill it from _generic.
    const saas = matchContentPack(brief({ rawPrompt: "our SaaS platform" }));
    expect(saas.id).toBe("saas");
    const trust = packSection(saas, PACK_DEFAULT_LOCALE, "trust");
    expect(trust.items?.length ?? 0).toBeGreaterThan(0);
  });

  it("restaurant fallback content contains no pet-care copy", () => {
    const restaurant = matchContentPack(brief({ rawPrompt: "nhà hàng của chúng tôi" }));
    expect(restaurant.id).toBe("restaurant");
    const serialized = JSON.stringify(restaurant);
    expect(serialized).not.toMatch(/PawJoy|thú cưng|grooming/i);
  });
});
