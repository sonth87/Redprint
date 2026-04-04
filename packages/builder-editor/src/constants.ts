/**
 * Builder Editor Constants — UI dimensions and styling
 *
 * Layout, toolbar sizing, overlay styling, canvas layout constants.
 * Internal to builder-editor; not part of public API.
 */

// ── Toolbar & Button Sizing ─────────────────────────────────────────────

/**
 * Section toolbar button size (28px).
 * Height and width of circular icon buttons in the vertical section toolbar.
 * Design: 28px = 3.5 × 8px grid units (comfortable click target).
 * Accessibility: Exceeds 44x44px recommendation by 1.5x when scaled.
 */
export const BTN_SIZE = 28 as const;

/**
 * Section toolbar vertical width (32px).
 * Width of the entire vertical toolbar container (holds 8 buttons stacked).
 * Design: 32px = 4 × 8px grid units (minimal width for icon toolbar).
 */
export const TOOLBAR_WIDTH = 32 as const;

/**
 * Toolbar icon size (16px).
 * Size of lucide-react icons rendered inside toolbar buttons.
 * Design: 16px = small enough to fit comfortably in 28px button with padding.
 */
export const ICON_SIZE = 16 as const;

/**
 * Toolbar button gap (2px).
 * Spacing between vertically-stacked toolbar buttons.
 * Design: 2px = minimal gap (buttons appear tightly grouped).
 */
export const TOOLBAR_BTN_GAP = 2 as const;

/**
 * Toolbar padding (4px).
 * Internal padding inside toolbar container (all sides).
 * Design: 4px = half grid unit (8px total vertical/horizontal padding).
 */
export const TOOLBAR_PADDING = 4 as const;

/**
 * Number of buttons in section toolbar (8 buttons).
 * Determines toolbar height: 8 × 28px + 7 × 2px gap + 2 × 4px padding = 238px.
 */
export const NUM_TOOLBAR_BUTTONS = 8 as const;

/**
 * Section hover zone height (32px).
 * Padding around element edges where hover state activates.
 * Makes small elements easier to interact with (Fitts' Law).
 * Design: 32px = roughly thumb width on touch devices (accessibility).
 */
export const SECTION_HOVER_ZONE = 32 as const;

// ── Resize Handles & Overlays ───────────────────────────────────────────

/**
 * Resize handle size (20px).
 * Width and height of corner/edge resize handles on selected elements.
 * Design: 20px = 2.5 × 8px (large enough for touch, doesn't obscure content).
 */
export const RESIZE_HANDLE_SIZE = 20 as const;

/**
 * Section overlay styling padding vertical (3px).
 * Vertical padding inside overlay containers.
 * Design: 3px = fine-tuning for visual balance with 20px handles.
 */
export const OVERLAY_PADDING_V = 3 as const;

/**
 * Section overlay styling padding horizontal (8px).
 * Horizontal padding inside overlay containers.
 * Design: 8px = 1 × 8px grid unit (standard horizontal padding).
 */
export const OVERLAY_PADDING_H = 8 as const;

/**
 * Overlay border radius (4px).
 * Border radius for overlay container corners.
 * Design: 4px = soft corners without being over-rounded.
 */
export const OVERLAY_BORDER_RADIUS = 4 as const;

/**
 * Overlay shadow blur radius (4px).
 * Blur radius for box-shadow on overlay elements.
 * Design: 4px = subtle shadow (suggests elevation without drama).
 */
export const OVERLAY_SHADOW_BLUR = 4 as const;

/**
 * Overlay font size (11px).
 * Base font size for text inside overlays (badges, labels).
 * Design: 11px = small enough for compact UI, large enough for readability.
 */
export const OVERLAY_FONT_SIZE = 11 as const;

// ── Distance Guide Styling ──────────────────────────────────────────────

/**
 * Distance guide cap height (6px).
 * Height of perpendicular cap lines on distance/measurement guides.
 * Design: 6px = visible but not distracting from main guide line.
 */
export const DISTANCE_GUIDE_CAP_HEIGHT = 6 as const;

/**
 * Distance guide cap offset (3px).
 * Horizontal offset of cap perpendicular lines from main vertical/horizontal line.
 * Design: 3px = half of cap height (visual balance).
 */
export const DISTANCE_GUIDE_CAP_OFFSET = 3 as const;

/**
 * Distance guide line width (1px).
 * Stroke width of distance/measurement guide lines.
 * Design: 1px = thin enough to not obstruct canvas, visible enough to see.
 */
export const DISTANCE_GUIDE_LINE_WIDTH = 1 as const;

/**
 * Distance guide label minimum font size (9px).
 * Smallest font size for distance annotation text (when heavily zoomed out).
 */
export const DISTANCE_LABEL_FONT_MIN = 9 as const;

/**
 * Distance guide label base font size (11px).
 * Base font size for distance annotation (before zoom scaling).
 * Used in: EditorOverlay calculation `Math.max(9, 11 / zoom)`.
 */
export const DISTANCE_LABEL_FONT_BASE = 11 as const;

// ── Dimension Display Styling ──────────────────────────────────────────

/**
 * Dimension display minimum font size (8px).
 * Smallest font size for dimension value badges.
 */
export const DIMENSION_FONT_MIN = 8 as const;

/**
 * Dimension display base font size (9px).
 * Base font size for dimension text (before zoom scaling).
 * Used in: EditorOverlay dimension calculation `max(8, 9 / zoom)`.
 */
export const DIMENSION_FONT_BASE = 9 as const;

/**
 * Dimension display vertical padding (1px).
 * Vertical padding inside dimension badge container.
 * Design: 1-2px = minimal vertical padding (text-heavy visualization).
 */
export const DIMENSION_PADDING_V = 1 as const;

/**
 * Dimension display horizontal padding (2px).
 * Horizontal padding inside dimension badge container.
 * Design: 2-4px = comfortable horizontal breathing room.
 */
export const DIMENSION_PADDING_H = 2 as const;

/**
 * Dimension display border radius (2px).
 * Border radius for dimension badge corners.
 * Design: 2px = subtle rounding (not pill-shaped).
 */
export const DIMENSION_BORDER_RADIUS = 2 as const;

/**
 * Dimension display offset from element (3px).
 * Distance between element edge and dimension label (in canvas-space).
 * Design: 3px = enough space to not overlap element border.
 */
export const DIMENSION_OFFSET = 3 as const;

// ── Selection & Hover Styling ──────────────────────────────────────────

/**
 * Selection outline minimum width (1px).
 * Minimum stroke width for selection boundary.
 * Design: Never go thinner than 1px (disappears at zoom levels).
 */
export const SELECTION_OUTLINE_MIN = 1 as const;

/**
 * Selection outline base width (2px).
 * Base stroke width for selection boundary (before zoom scaling).
 * Used in: EditorOverlay selection calculation `max(1, 2 / zoom)`.
 * Design: 2px = visible at 1x zoom, thins to 1px at 2x+ zoom.
 */
export const SELECTION_OUTLINE_BASE = 2 as const;

/**
 * Hover outline width (1px).
 * Stroke width for temporary hover indication (non-selected element hover).
 * Design: 1px = subtle indication, higher priority given to selection.
 */
export const HOVER_OUTLINE_WIDTH = 1 as const;

/**
 * Resize handle minimum size (6px).
 * Minimum width/height of resize handles.
 * Design: Never go smaller than 6px (becomes impossible to interact with).
 */
export const RESIZE_HANDLE_MIN = 6 as const;

/**
 * Resize handle base size (8px).
 * Base width/height for resize handles (before zoom scaling).
 * Used in: EditorOverlay handle calculation `max(6, 8 / zoom)`.
 * Design: 8px = comfortable touch target at 1x zoom.
 */
export const RESIZE_HANDLE_BASE = 8 as const;

// ── Canvas Layout Constants ────────────────────────────────────────────

/**
 * Dual-mode frame gap in canvas-space (240px).
 * Horizontal spacing (px) between desktop and mobile frame in dual-view mode.
 * Canvas-space pixels (not screen-space; scaled by zoom later).
 * Design: 240px = visible gap that accommodates viewport guides.
 * Note: Crucial for responsive editing in dual-mode canvas.
 */
export const DUAL_GAP_PX = 240 as const;

/**
 * Toolbar left offset from frame edge (8px).
 * Distance (px in screen-space) between frame edge and toolbar placement.
 * Negative offset pulls toolbar to left of frame border.
 * Design: 8px = enough space to see both toolbar and frame edge clearly.
 */
export const TOOLBAR_LEFT_OFFSET = 8 as const;

// ── Panel Position Presets ────────────────────────────────────────────

/**
 * Default position for Components panel.
 * Initial x, y position in screen-space when editor first loads.
 * Design: x:16, y:64 = top-left corner with comfortable margin.
 */
export const DEFAULT_COMPONENTS_PANEL_POS = { x: 16, y: 64 } as const;

/**
 * Default position for Layers panel.
 * Initial x, y position in screen-space when editor first loads.
 * Design: x:16, y:480 = left side, stacked below Components panel.
 */
export const DEFAULT_LAYERS_PANEL_POS = { x: 16, y: 480 } as const;

/**
 * Default position for Properties panel.
 * Uses `right: 16` instead of `left` for right-edge alignment.
 * Design: right:16, y:64 = top-right corner with comfortable margin.
 */
export const DEFAULT_PROPERTIES_PANEL_POS = { right: 16, y: 64 } as const;
