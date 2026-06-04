// Configuration Constants
export const SCALE = 50; // 50 pixels per 1 grid unit
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const CENTER_X = CANVAS_WIDTH / 2; // 600px

/**
 * Convert Grid Coordinates to Canvas Pixels
 * @param gridX The X coordinate on the grid (-12 to +12)
 * @param gridY The Y coordinate on the grid (0 to 12)
 * @returns { x, y } in canvas pixels
 */
export const gridToCanvas = (gridX: number, gridY: number): { x: number; y: number } => {
    // gridX = 0 is CENTER_X. Positive gridX goes to the right
    const x = CENTER_X + gridX * SCALE;
    // gridY = 0 is the front (bottom of canvas for marching band perspective).
    // As gridY increases (depth), we go UP the canvas (smaller pixel y).
    const y = CANVAS_HEIGHT - gridY * SCALE;
    return { x, y };
};

/**
 * Convert Canvas Pixels to Grid Coordinates
 * @param canvasX The X coordinate in pixels
 * @param canvasY The Y coordinate in pixels
 * @returns { gridX, gridY }
 */
export const canvasToGrid = (canvasX: number, canvasY: number): { gridX: number; gridY: number } => {
    const gridX = (canvasX - CENTER_X) / SCALE;
    const gridY = (CANVAS_HEIGHT - canvasY) / SCALE;
    return { gridX, gridY };
};

/**
 * Snap a value to the nearest interval (e.g., 0.5 for half-steps)
 * @param value The raw grid coordinate value
 * @param interval The snapping interval (default: 0.5)
 * @returns the snapped value
 */
export const snapToInterval = (value: number, interval = 0.5): number => {
    return Math.round(value / interval) * interval;
};
