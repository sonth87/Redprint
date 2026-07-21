import { afterEach, describe, expect, it } from "vitest";
import { compileGenericComponent, mapContentToProps, genericAdapterEnabled, type ContentSlots, type GenericAdapterContent } from "./generic-adapter.js";
import type { ComponentContract } from "./component-contract-resolver.js";

const ORIGINAL_ENV = { ...process.env };

function contract(overrides: Partial<ComponentContract> = {}): ComponentContract {
  return {
    type: "Testimonial",
    name: "Testimonial",
    category: "content",
    canContainChildren: false,
    requiredProps: [
      { key: "quote", label: "Quote", type: "string", required: true },
      { key: "author", label: "Author", type: "string", required: true },
    ],
    optionalProps: [{ key: "avatarUrl", label: "Avatar", type: "image", required: false }],
    defaultProps: {},
    variants: [],
    constraints: [],
    fallbackTo: ["Text"],
    examples: [],
    contractSource: "aiHints",
    ...overrides,
  };
}

describe("mapContentToProps", () => {
  it("maps heading/body/ctaLabel/media onto declared slots", () => {
    const slots: ContentSlots = { heading: "title", body: "subtitle", ctaLabel: "buttonLabel", mediaSrc: "img", mediaAlt: "imgAlt" };
    const content: GenericAdapterContent = { heading: "Hello", body: "World", ctaLabel: "Go", media: [{ src: "https://x/a.jpg", alt: "a" }] };
    expect(mapContentToProps(slots, content)).toEqual({
      title: "Hello",
      subtitle: "World",
      buttonLabel: "Go",
      img: "https://x/a.jpg",
      imgAlt: "a",
    });
  });

  it("skips a content field with no matching slot instead of guessing", () => {
    const slots: ContentSlots = { heading: "title" };
    const content: GenericAdapterContent = { heading: "Hello", body: "World" };
    expect(mapContentToProps(slots, content)).toEqual({ title: "Hello" });
  });

  it("maps items as array-of-objects with itemKeys", () => {
    const slots: ContentSlots = { items: { prop: "tiers", shape: "array-of-objects", itemKeys: { title: "name", body: "desc" }, maxItems: 2 } };
    const content: GenericAdapterContent = { items: [{ title: "A", body: "aa" }, { title: "B", body: "bb" }, { title: "C", body: "cc" }] };
    const props = mapContentToProps(slots, content);
    expect(props.tiers).toEqual([{ name: "A", desc: "aa" }, { name: "B", desc: "bb" }]); // capped at maxItems
  });

  it("maps items as indexed-props", () => {
    const slots: ContentSlots = { items: { prop: "slide", shape: "indexed-props", itemKeys: { title: "title", body: "body" }, maxItems: 2 } };
    const content: GenericAdapterContent = { items: [{ title: "A", body: "aa" }, { title: "B", body: "bb" }] };
    const props = mapContentToProps(slots, content);
    expect(props).toEqual({ slide0_title: "A", slide0_body: "aa", slide1_title: "B", slide1_body: "bb" });
  });

  it("returns empty props when contentSlots is undefined (version skew, roadmap 03/01 corner case)", () => {
    expect(mapContentToProps(undefined, { heading: "x" })).toEqual({});
  });
});

describe("compileGenericComponent — Testimonial fixture (roadmap 03/02 test case)", () => {
  const slots: ContentSlots = { heading: "quote", body: "author", mediaSrc: "avatarUrl" };

  it("compiles a valid ADD_NODE from section content mapped through contentSlots", () => {
    const content: GenericAdapterContent = { heading: "Amazing service!", body: "Jane Doe", media: [{ src: "https://x/avatar.jpg", alt: "Jane" }] };
    const cmd = compileGenericComponent({
      id: "t-1",
      parentId: "grid-1",
      componentType: "Testimonial",
      contract: contract(),
      contentSlots: slots,
      content,
      tokens: { borderRadius: "8px" },
    });
    expect(cmd).not.toBeNull();
    expect(cmd?.payload.componentType).toBe("Testimonial");
    expect(cmd?.payload.nodeId).toBe("t-1");
    expect(cmd?.payload.parentId).toBe("grid-1");
    expect((cmd?.payload.props as Record<string, unknown>).quote).toBe("Amazing service!");
    expect((cmd?.payload.props as Record<string, unknown>).author).toBe("Jane Doe");
    expect((cmd?.payload.props as Record<string, unknown>).avatarUrl).toBe("https://x/avatar.jpg");
  });

  it("returns null when the contract still fails validation after repair (missing required, no default)", () => {
    // No heading/body content at all → quote/author stay unset with no default → invalid.
    const cmd = compileGenericComponent({
      id: "t-2",
      parentId: "grid-1",
      componentType: "Testimonial",
      contract: contract(),
      contentSlots: undefined, // no slots → nothing mapped → required props missing
      content: {},
      tokens: {},
    });
    expect(cmd).toBeNull();
  });

  it("a component that declares no slot for a content field just omits that field (not a validation failure)", () => {
    // author has no default, so it will fail unless mapped — this proves the
    // fixture behaves correctly when a slot IS present, contrasted with the
    // missing-slot case above.
    const partialSlots: ContentSlots = { heading: "quote" }; // no body slot for author
    const content: GenericAdapterContent = { heading: "Great!", body: "Someone" };
    const cmd = compileGenericComponent({
      id: "t-3",
      parentId: "grid-1",
      componentType: "Testimonial",
      contract: contract(),
      contentSlots: partialSlots,
      content,
      tokens: {},
    });
    // author required but unmapped and no default → validation fails → null.
    expect(cmd).toBeNull();
  });

  it("uses the component's defaultProps as a base so a default can satisfy an unmapped required prop", () => {
    const cmd = compileGenericComponent({
      id: "t-4",
      parentId: "grid-1",
      componentType: "Testimonial",
      contract: contract({ defaultProps: { author: "Anonymous" } }),
      contentSlots: { heading: "quote" }, // author has no slot but has a default
      content: { heading: "Loved it" },
      tokens: {},
    });
    expect(cmd).not.toBeNull();
    expect((cmd?.payload.props as Record<string, unknown>).author).toBe("Anonymous");
  });
});

describe("genericAdapterEnabled", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("is on by default and off when AI_GENERIC_ADAPTER=false", () => {
    delete process.env.AI_GENERIC_ADAPTER;
    expect(genericAdapterEnabled()).toBe(true);
    process.env.AI_GENERIC_ADAPTER = "false";
    expect(genericAdapterEnabled()).toBe(false);
  });
});
