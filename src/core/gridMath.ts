// ฟังก์ชันคำนวณหาค่าพิกเซลต่อช่องตารางแบบแปรผันตามหน้าจอจริง
export const getDynamicScale = (
  canvasWidth: number,
  canvasHeight: number,
  gridMaxX: number,
  gridMaxY: number
): number => {
  const padding = 60; // เว้นระยะขอบรอบสนามด้านละ 30px ไม่ให้ตัวเลขขอบสนามติดขอบจอเกินไป
  const availableWidth = canvasWidth - padding;
  const availableHeight = canvasHeight - padding;

  const scaleX = availableWidth / (gridMaxX * 2); // สนามกว้างจาก -maxX ถึง +maxX
  const scaleY = availableHeight / gridMaxY;

  // เลือกสเกลที่เล็กที่สุด เพื่อการันตีว่าสนามจะไม่หลุดขอบหน้าต่างทั้งแนวตั้งและแนวนอน
  return Math.min(scaleX, scaleY);
};

export const gridToCanvas = (
  gridX: number,
  gridY: number,
  canvasWidth: number,
  canvasHeight: number,
  gridMaxX: number,
  gridMaxY: number
): { x: number; y: number } => {
  const scale = getDynamicScale(canvasWidth, canvasHeight, gridMaxX, gridMaxY);

  const centerX = canvasWidth / 2;
  // ตั้งจุดศูนย์กลางแนวลึก (Y) ให้อยู่ตรงกลางของพื้นที่หน้าจอ
  const centerY = (canvasHeight + (gridMaxY * scale)) / 2;

  const x = centerX + gridX * scale;
  const y = centerY - gridY * scale;
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
  const scale = getDynamicScale(canvasWidth, canvasHeight, gridMaxX, gridMaxY);

  const centerX = canvasWidth / 2;
  const centerY = (canvasHeight + (gridMaxY * scale)) / 2;

  const gridX = (canvasX - centerX) / scale;
  const gridY = (centerY - canvasY) / scale;
  return { gridX, gridY };
};

export const snapToInterval = (value: number, interval = 0.5): number => {
  return Math.round(value / interval) * interval;
};