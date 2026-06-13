export const gridToCanvas = (
  gridX: number,
  gridY: number,
  canvasWidth: number,
  canvasHeight: number,
  gridMaxX: number,
  gridMaxY: number
): { x: number; y: number } => {
  // คำนวณหาค่าพิกเซลต่อช่องตารางแบบไดนามิก
  const scaleX = canvasWidth / (gridMaxX * 2);
  const scaleY = canvasHeight / gridMaxY;
  const scale = Math.min(scaleX, scaleY);

  const centerX = canvasWidth / 2;
  const x = centerX + gridX * scale;
  const y = canvasHeight - gridY * scale;
  return { x, y };
};

export const canvasToGrid = (
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  gridMaxX: number,
  gridMaxY: number
): { gridX: number; gridY: number } => {
  const scaleX = canvasWidth / (gridMaxX * 2);
  const scaleY = canvasHeight / gridMaxY;
  const scale = Math.min(scaleX, scaleY);

  const centerX = canvasWidth / 2;
  const gridX = (canvasX - centerX) / scale;
  const gridY = (canvasHeight - canvasY) / scale;
  return { gridX, gridY };
};

export const snapToInterval = (value: number, interval = 0.5): number => {
  return Math.round(value / interval) * interval;
};