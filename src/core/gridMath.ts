// 📄 แก้ไขไฟล์ core/gridMath.ts ใหม่ทั้งหมดเป็นแบบนี้ครับ
export const DEFAULT_SCALE = 50; 

export const gridToCanvas = (
  gridX: number, 
  gridY: number, 
  canvasWidth: number, 
  canvasHeight: number,
  scale = DEFAULT_SCALE
): { x: number; y: number } => {
    const centerX = canvasWidth / 2;
    const x = centerX + gridX * scale;
    // แกน Y ยิ่งมากยิ่งลึก (ขึ้นด้านบนของจอ) เริ่มนับจากขอบล่างสนาม
    const y = canvasHeight - gridY * scale;
    return { x, y };
};

export const canvasToGrid = (
  canvasX: number, 
  canvasY: number, 
  canvasWidth: number, 
  canvasHeight: number,
  scale = DEFAULT_SCALE
): { gridX: number; gridY: number } => {
    const centerX = canvasWidth / 2;
    const gridX = (canvasX - centerX) / scale;
    const gridY = (canvasHeight - canvasY) / scale;
    return { gridX, gridY };
};
export const snapToInterval = (value: number, interval = 0.5): number => {
    return Math.round(value / interval) * interval;
};