/**
 * Base grid/snap unit size in pixels (8px).
 * Foundation for all spacing, sizing, and alignment in the builder.
 * Design: 8px = 1 unit on typical 96 DPI displays.
 * Usage: All dimensions are multiples of 8 (4, 8, 16, 24, 32, 40, 48, 56, 64, 72).
 */
export const GRID_UNIT_PX: number = 8;

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
 * Default duplicate/clone position offset ({ x: 20, y: 20 }).
 * When duplicating an element via DUPLICATE_NODE command, offset the copy by this amount.
 * Makes the duplicate visually distinct and indicates a new element was created.
 * Design: 20px = barely-noticeable offset; prevents duplicate appearing occluded.
 * Rationale: User can immediately see the duplicate and easily reposition it.
 */
export const DUPLICATE_OFFSET = { x: 20, y: 20 } as const;
