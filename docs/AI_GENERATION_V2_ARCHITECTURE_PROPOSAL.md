# AI Generation v2 Architecture Proposal

> Proposal for human maintainers to mirror into `.claude/ARCHITECTURE.md` if accepted.
> AI agents must not edit `.claude/ARCHITECTURE.md` directly per project rules.

## Summary

Full-page AI generation now uses a provider-neutral planning pipeline:

```text
User prompt + UI options
  -> CreativeBrief + PagePlan
  -> validated skeleton Section commands
  -> compact ComponentCatalogSummary
  -> on-demand ComponentContract details
  -> independent SectionPlan generation
  -> deterministic adapter/compiler
  -> command validation
  -> SSE partial/complete status
```

The LLM no longer acts as the primary source of raw builder commands for page generation. It proposes
structured intent; backend code compiles that intent into commands compatible with the builder
component registry.

This proposal has been extended with rich component awareness and component contracts. The LLM can express that a section
would benefit from richer components such as `NavigationMenu`, `GalleryPro`, `GalleryGrid`,
`GallerySlider`, `CollapsibleText`, `TextMarquee`, `TextMask`, `Shape`, `Row`, `Column`, or
`Repeater`, but the backend compiler still owns the final props and builder commands.

## Proposed Architecture Updates

- Add an AI Generation Contract layer in `apps/api` with `CreativeBrief`, `PagePlan`, and
  `SectionPlan` as the page-generation IR.
- Add a compact `ComponentCapability` manifest layer derived from the runtime
  `availableComponents` list. Do not prompt with full raw `propSchema`; include only `type`,
  `purpose`, `bestFor`, `requiredProps`, `keyProps`, `variants`, and `fallbackTo`.
- Add a hybrid `ComponentContractResolver`: use `availableComponents.propSchema`, `capabilities`,
  and `defaultProps` as the source of truth, then merge curated metadata for complex components.
- Send detailed `ComponentContract` blocks only for candidate components relevant to the current
  section.
- Extend `SectionPlan` intent with `layoutVariant`, `preferredComponents`, `interactionIntent`,
  `componentIntents`, `mediaItems`, `navItems`, and `visualEmphasis`. The LLM returns intent only,
  never commands.
- Treat `PagePlan` as the source of truth for section count, order, skeleton IDs, and generation
  progress.
- Allow the planner to include media-heavy sections, especially gallery sections, for visual
  industries such as pet services, portfolio, ecommerce, venue, beauty/spa, restaurant, and travel.
- Use deterministic `ai-*` node IDs for full-page skeleton sections so section content can target
  real parents safely.
- Require validation before commands are streamed to the client: registered component type,
  known parent, no duplicate IDs, no leaf parents, no leaf nodes directly under root, valid command
  shape, required props, enum values, and design-token-aware styling.
- Use a deterministic compiler strategy map:
  - `header`: `NavigationMenu` with text/button fallback
  - `hero`: `TextMask`/`TextMarquee` + Image with standard hero fallback
  - `services`: `GalleryPro`/`GalleryGrid` plus cards with grid-card fallback
  - `gallery`: `GalleryPro` -> `GallerySlider` -> `GalleryGrid` -> Grid + Image
  - `testimonials`: gallery/slider proof with testimonial-card fallback
  - `faq`: `CollapsibleText` with FAQ-card fallback
  - `cta`: marquee/image/button with CTA block fallback
  - `footer`: `NavigationMenu` + text + divider with footer-card fallback
- Treat component adapters as the deterministic bridge from `componentIntents` to safe props and
  commands. Adapters should validate against component contracts and never pass arbitrary AI config
  through to builder props.
- Treat media as best-effort. Missing or invalid `src` values should be replaced by deterministic
  industry/section fallback images; component item counts should be capped per strategy.
- Page generation failures after `plan_ready` are partial by default: retry the failed section, then
  emit fallback commands and finish with `complete.status = "partial"`.
- Section generation should run with bounded concurrency and section priority. Hero/service/CTA
  content can fill early while lower-priority sections continue in the background.
- Error handling should distinguish repairable output errors from provider availability errors.
  JSON/schema/compiler issues can retry; timeout/rate-limit/overloaded-provider issues should
  bypass to deterministic fallback to avoid blocking the page.
- `.claude/docs/AI_ASSISTANT.md` should be considered the detailed operational reference for this
  pipeline.

## Logging Expectations

When `AI_DEBUG=true`, job and section events should include component-aware metadata:
`manifestComponents`, `contractComponents`, `sectionType`, `preferredComponents`,
`componentIntents`, `selectedComponent`, `adapterUsed`, `fallbackComponent`, `fallbackReason`,
`richComponentUsed`, `mediaItemCount`, `propValidationErrors`, and `validationErrorCode`. Full
prompts/responses should remain behind `AI_PROMPT_DEBUG=true`, and API keys must never be logged.
