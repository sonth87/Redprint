/**
 * Shared Constants — centralized values across all packages
 *
 * Timing, colors, zoom constraints, and common layout dimensions.
 * Exported for use in builder-editor, builder-core, builder-react, builder-renderer.
 */

// ── Timing Constants ──────────────────────────────────────────────────────

/**
 * Short tooltip appearance delay (300ms).
 * Used for builder UI tooltips (SectionToolbar, ContextualToolbar).
 * Design: ~300ms = "quick glance" threshold (UX sweet spot).
 */
export const TOOLTIP_DELAY_MS: number = 300;

/**
 * Extended tooltip appearance delay (400ms).
 * Used for editor toolbar tooltips (EditorToolbar).
 * Design: ~400ms = "intentional inspection" threshold.
 */
export const TOOLTIP_DELAY_EXTENDED_MS: number = 400;

/**
 * Fast box-shadow transition duration (0.15s = 150ms).
 * Subtle depth changes during hover/interaction states.
 * Design: 150ms = "barely noticeable" but creates depth feedback.
 */
export const TRANSITION_FAST_MS: number = 150;

/**
 * Medium transition duration for layout changes (0.25s = 250ms).
 * Width/height transitions in BuilderEditor panels and canvas.
 * Design: 250ms = "purposeful change" without being sluggish.
 */
export const TRANSITION_MID_MS: number = 250;

/**
 * Animation duration for scale/opacity transforms (200ms).
 * Used with Tailwind CSS `duration-200` class for component animations.
 * Design: 200ms = standard React/web UI animation duration.
 */
export const ANIMATION_SCALE_MS: number = 200;

/**
 * Tailwind CSS duration class string values.
 */
export const TRANSITION_FAST_CSS: string = `${TRANSITION_FAST_MS}ms`;
export const TRANSITION_MID_CSS: string = `${TRANSITION_MID_MS}ms`;
export const ANIMATION_SCALE_CSS: string = `${ANIMATION_SCALE_MS}ms`;
export const TOOLTIP_DELAY_CSS: string = `${TOOLTIP_DELAY_MS}ms`;

// ── Color Constants ──────────────────────────────────────────────────────

/**
 * Snap guide overlay color (indigo #6366f1).
 * Primary color for visual feedback when snapping/aligning elements.
 * Design rationale: Indigo conveys "precision" and "active editing state".
 */
export const SNAP_GUIDE_COLOR: string = "#6366f1";

/**
 * Distance/measurement guide color (orange hsl(32 95% 55%)).
 * Secondary color for dimension annotations and measurement labels.
 * Design rationale: Orange = "measurement" / "informational" signal.
 */
export const DISTANCE_GUIDE_COLOR: string = "hsl(32 95% 55%)";

/**
 * Dark variant of distance guide color for text labels (hsl(32 95% 45%)).
 * Darker for sufficient text contrast ratio (WCAG AAA).
 */
export const DISTANCE_GUIDE_COLOR_DARK: string = "hsl(32 95% 45%)";

/**
 * Section/element border color (light gray #c4c4c4).
 * Used for section boundaries and element outlines in canvas.
 * Design rationale: Mid-gray = "neutral container boundary".
 */
export const SECTION_BORDER_COLOR: string = "#c4c4c4";

/**
 * UI border color (light gray #e2e2e2).
 * Used for form controls and toolbar button borders.
 * Lighter than SECTION_BORDER_COLOR to maintain visual hierarchy.
 */
export const UI_BORDER_COLOR: string = "#e2e2e2";

/**
 * Button/text foreground color (dark gray #374151).
 * Used for button labels and interactive text.
 * Design rationale: Dark gray = "primary action" signal.
 */
export const UI_TEXT_COLOR: string = "#374151";

/**
 * Dimension display background (dark blue hsl(221.2 83.2% 25%)).
 * High contrast with orange text for readability.
 * Design rationale: Dark blue = "information container".
 */
export const DIMENSION_BG_COLOR: string = "hsl(221.2 83.2% 25%)";

/**
 * Destructive action color (red #f00).
 * Used for danger buttons and destructive operations.
 * Design rationale: Red = "destructive/warning" signal (universal).
 */
export const DESTRUCTIVE_COLOR: string = "#f00";

// ── Zoom & Viewport Constants ─────────────────────────────────────────────

/**
 * Standard zoom level presets for editor canvas.
 * Ascending order for UI dropdown menus.
 * Design: 0.25x (overview) → 1x (actual) → 4x (magnified).
 */
export const ZOOM_LEVELS: readonly number[] = [0.05, 0.075, 0.1, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/**
 * Minimum zoom level constraint (0.25 = 25%).
 * Prevents zooming out beyond miniature view.
 * Design: 0.25x is threshold where element borders become subpixel.
 */
export const MIN_ZOOM: number = 0.25;

/**
 * Maximum zoom level constraint (4 = 400%).
 * Prevents zooming in beyond 4x magnification.
 * Design: 4x is threshold where standard UI buttons become hand-sized.
 */
export const MAX_ZOOM: number = 4;

/**
 * Container padding for fit-to-screen calculations (64px).
 * Spacing around canvas when using "fit to window" zoom.
 * Design: 64px = comfortable margin (~1 thumb width on desktop).
 */
export const FIT_TO_SCREEN_PADDING: number = 64;

/**
 * Canvas centering offset in pixels (32px).
 * Applied when centering canvas viewport after zoom/pan operations.
 * Design: 32px = half of FIT_TO_SCREEN_PADDING (symmetry principle).
 */
export const CANVAS_CENTER_OFFSET: number = 32;

/**
 * Vertical centering divisor (4).
 * Applied as `CANVAS_CENTER_OFFSET / 4` for Y-axis centering.
 * Design: Users focus on upper third; keeps content slightly higher.
 */
export const VERTICAL_CENTER_DIVISOR: number = 4;

// ── UI Layout Constants ───────────────────────────────────────────────────

/**
 * Base grid/snap unit size in pixels (8px).
 * Foundation for all spacing, sizing, and alignment in the builder.
 * Design: 8px = 1 unit on typical 96 DPI displays.
 * Usage: All dimensions are multiples of 8 (4, 8, 16, 24, 32, 40, 48, 56, 64, 72).
 */
export const GRID_UNIT_PX: number = 4;

/**
 * Default section/container minimum height (400px).
 * Fallback height for new sections when no explicit minHeight is set.
 * Design: 400px = comfortable vertical section on desktop.
 */
export const DEFAULT_SECTION_HEIGHT_PX: number = 400;

/**
 * Default left panel width (260px).
 * Initial width of components/layers panel when editor first loads.
 * Design: 260px ≈ 32-40 characters of text; readable without excessive space.
 */
export const DEFAULT_LEFT_PANEL_WIDTH_PX: number = 260;

/**
 * Default bottom panel height (200px).
 * Initial height of properties panel when editor first loads.
 * Design: 200px ≈ 3-4 property rows; visible without consuming too much space.
 */
export const DEFAULT_BOTTOM_PANEL_HEIGHT_PX: number = 200;

/**
 * Hover detection zone height for overlay interactions (32px).
 * Padding around element edges where hover state activates.
 * Makes small elements easier to interact with (Fitts' Law).
 * Design: 32px = roughly thumb width on touch devices (accessibility).
 */
export const HOVER_ZONE_HEIGHT_PX: number = 32;

/**
 * Default duplicate/clone position offset (20px).
 * When duplicating an element, offset its position by this amount (x and y).
 * Makes duplicate visually distinct and indicates new element creation.
 * Design: 20px = barely-noticeable offset.
 */
export const DUPLICATE_OFFSET_PX: number = 20;
