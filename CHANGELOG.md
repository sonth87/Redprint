# Changelog

## 0.1.0 - 2026-06-17

### Added
- Added a hybrid AI `ComponentContract` layer that resolves component details from
  `availableComponents.propSchema`, `capabilities`, and curated metadata for complex components.
- Added on-demand component contracts for section prompts and `componentIntents` in `SectionPlan`.
- Added schema-based prop validation for compiled component props.
- Added tests for contract resolution, prop validation, and component-intent adapter preference.

### Changed
- Component capability manifests now include all available components, not only hardcoded rich
  components, while still merging curated guidance where available.
- The editor sends richer `propSchema` metadata and `defaultProps` in AI context.
- Compiler selection now treats `componentIntents` as adapter preferences before falling back to
  existing deterministic strategies.

## 0.0.4 - 2026-06-17

### Added
- Added a compact AI component capability manifest derived from `availableComponents` so page
  generation can reason about richer registered components without receiving full raw schemas.
- Extended `SectionPlan` intent with preferred components, interaction intent, media items, nav
  items, layout variant, and visual emphasis.
- Added compiler strategies for `NavigationMenu`, `GalleryPro`, `GalleryGrid`, `GallerySlider`,
  `CollapsibleText`, `TextMarquee`, `TextMask`, `Shape`, `Row`, and `Column`.
- Added backend tests for rich component manifest filtering, rich compiler selection, media fallback,
  and unavailable-component fallback behavior.

### Changed
- Short visual/service prompts such as pet services now include a gallery section in the
  deterministic PagePlan while preserving required sections like CTA and footer.
- Full-page fallback generation now produces richer deterministic content with media, navigation,
  expandable FAQ blocks, and playful hero/CTA elements when those components are registered.
- AI debug logging now includes component-aware metadata such as manifest components, preferred
  components, selected/fallback component, fallback reason, rich component usage, and media count.

### Fixed
- Prevented the page-plan normalizer from trimming required sections when a provider returns too
  many optional sections.
- Strengthened compiled command validation for duplicate node IDs, leaf parents, direct root leaves,
  required props, and rich component enum values.

## 0.0.3 - 2026-06-17

### Added
- Replaced AI page generation with a PagePlan-based SSE pipeline that streams `job_started`, `plan_ready`, per-section progress, partial failures, and final completion status.
- Added provider-neutral Zod contracts for `CreativeBrief`, `PagePlan`, and `SectionPlan`.
- Added deterministic skeleton generation, section compilation, validation, retry, and fallback content for partial page generation.
- Added AI generation tests for planner guardrails, compiler parent safety, and backend-stable AI node IDs.

### Changed
- Full-page generation now uses the Page Generator modal from empty canvas instead of the single-response AI Assistant.
- Palette and tone selections are sent as first-class generation options.
- AI debug logging now records job/section events and truncates prompts unless `AI_PROMPT_DEBUG=true`.
- Grid editor placeholders now hide when AI-generated grids already have children, avoiding visible dashed empty cells in generated pages.
- AI fallback copy and layout quality were improved for short pet-service prompts, including more specific Vietnamese content and supporting images.

### Fixed
- Fixed full-page `REMOVE_NODE` payloads to use `nodeId`.
- Fixed backend-stable `ai-*` node IDs being replaced during normalization, preventing skeleton/content parent mismatches.
- Fixed full-page generation paths that still used `/api/ai/chat`, which could surface raw provider timeout JSON instead of the SSE/fallback pipeline.
