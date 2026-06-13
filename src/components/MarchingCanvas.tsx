import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { gridToCanvas, canvasToGrid, snapToInterval } from '../core/gridMath';
import { useProjectStore } from '../store/projectStore';

const MarchingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const performersGroups = useRef<Map<string, fabric.Group>>(new Map());
  const conesGroups = useRef<Map<string, fabric.Group>>(new Map());

  // 🛠️ ล็อคมิติมิติพิกเซลการวาดสนามให้คงที่ (สี่เหลี่ยมผืนผ้า 2:1 อัตราส่วนมาตรฐานสนามซ้อม)
  // วิธีนี้จะทำให้พิกัด เส้นตาราง และตัวหนังสือบอกตำแหน่งนิ่ง 100% ไม่มีวันเบลอหรือซ้อนทับกัน
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 450;
  
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const sets = useProjectStore(state => state.data.sets);
  const performers = useProjectStore(state => state.data.performers);
  
  const isPlaying = useProjectStore(state => state.isPlaying);
  const currentTime = useProjectStore(state => state.currentTime);
  
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  const canvasConfig = useProjectStore(state => state.canvasConfig);
  const cones = useProjectStore(state => state.cones) || [];

  // วาดกระดานและจัดการ Event ตารางกริด
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      selection: true,
    });
    fabricCanvas.current = canvas;

    // วาดตารางกริดพื้นหลังตามขนาดแกน X, Y ที่ตั้งค่าจาก Store
    drawGrid(canvas, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

    // ดักจับจังหวะที่ผู้ใช้งานกำลังลากตัวนักแสดง (ช่วยดูดติดเส้นตารางกึ่งกลางบล็อก 0.5 ก้าวอัตโนมัติ)
    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target || target.isCone) return; // ล็อคไม่ให้ไปยุ่งกับกรวยอัตโนมัติ

      const { gridX, gridY } = canvasToGrid(
        target.left || 0, target.top || 0,
        CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY
      );

      const { x, y } = gridToCanvas(
        snapToInterval(gridX, 0.5), snapToInterval(gridY, 0.5),
        CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY
      );
      target.set({ left: x, top: y });
    });

    // อัปเดตพิกัดลงในใจระบบ (Store) เมื่อปล่อยมือจากการลาก
    canvas.on('object:modified', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target || target.isCone) return;

      if (target.type === 'activeSelection') {
        const sel = target as fabric.ActiveSelection;
        sel.forEachObject((obj: any) => {
          if (obj.id && !obj.isCone) updatePosition(obj);
        });
      } else if (target.id) {
        updatePosition(target);
      }
    });

    const handleSelection = (e: any) => {
      if (e.selected && e.selected.length === 1) {
        const targetObj = e.selected[0];
        if (targetObj && targetObj.id && !targetObj.isCone) setSelectedPerformerId(targetObj.id);
      } else {
        setSelectedPerformerId(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedPerformerId(null));

    return () => {
      canvas.dispose();
      performersGroups.current.clear();
      conesGroups.current.clear();
    };
  }, [canvasConfig.gridMaxX, canvasConfig.gridMaxY, setSelectedPerformerId]);

  // ฟังก์ชันอัปเดตตำแหน่งเฉพาะของตัวนักแสดง
  const updatePosition = (obj: any) => {
    const { gridX, gridY } = canvasToGrid(obj.left || 0, obj.top || 0, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    const finalGridX = snapToInterval(gridX, 0.5);
    const finalGridY = snapToInterval(gridY, 0.5);
    
    const { x, y } = gridToCanvas(finalGridX, finalGridY, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    obj.set({ left: x, top: y });
    obj.setCoords();
    
    useProjectStore.getState().updateSetPositions(
      useProjectStore.getState().currentSetIndex, obj.id, finalGridX, finalGridY
    );
  };

  // 🛠️ ปรับปรุงฟังก์ชันวาดกริดให้อ่านง่าย มีการปูพื้นหลังหลบเส้นตารางพาดตัดขอบชัดเจน
  const drawGrid = (canvas: fabric.Canvas, width: number, height: number, maxX: number, maxY: number) => {
    const fontSize = 10;

    // วาดเส้นตารางแนวลึก (Horizontal lines - แกน Y)
    for (let i = 0; i <= maxY; i++) {
      const { y } = gridToCanvas(0, i, width, height, maxX, maxY);
      canvas.add(new fabric.Line([0, y, width, y], {
        stroke: i % 4 === 0 ? '#334155' : '#1e293b',
        strokeWidth: i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
      if (i > 0) {
        canvas.add(new fabric.Textbox(i.toString(), {
          left: 8, top: y - (fontSize / 2 + 2), fontSize: fontSize, fill: '#64748b', fontFamily: 'monospace', selectable: false, evented: false
        }));
      }
    }

    // วาดเส้นตารางแนวตั้ง (Vertical lines - แกน X)
    for (let i = -maxX; i <= maxX; i++) {
      const { x, y: bottomY } = gridToCanvas(i, 0, width, height, maxX, maxY);
      canvas.add(new fabric.Line([x, 0, x, height], {
        stroke: i === 0 ? '#475569' : (i % 4 === 0 ? '#334155' : '#1e293b'),
        strokeWidth: i === 0 || i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
      
      const label = i === 0 ? '0' : (i > 0 ? `R${i}` : `L${Math.abs(i)}`);
      
      // ผลักพิกัด L / 0 / R ลงใต้เส้นขอบสนาม และปูพื้นหลังทึบตัดขอบเพื่อให้อ่านง่ายขึ้นทันที
      canvas.add(new fabric.Textbox(label, {
        left: x - 20,
        top: bottomY + 6,
        width: 40,
        fontSize: fontSize,
        fill: i === 0 ? '#38bdf8' : '#64748b',
        fontFamily: 'monospace',
        fontWeight: i === 0 ? 'bold' : 'normal',
        textAlign: 'center',
        backgroundColor: '#0f172a',
        selectable: false,
        evented: false
      }));
    }
  };

  // 🛠️ คอนเซปต์ล้ำๆ: เรนเดอร์กรวยอัตโนมัติล็อกตำแหน่งไว้เป็น "วัตถุฉากหลัง" ประจำพิกัดสนาม (ห้ามลากเล่น)
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    conesGroups.current.forEach(group => canvas.remove(group));
    conesGroups.current.clear();

    const size = 14; // ขนาดกรวยนิ่งชัดเจนดูง่าย

    cones.forEach((cone) => {
      const { x, y } = gridToCanvas(cone.x, cone.y, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

      // วาดรูปทรงกรวยสี่เหลี่ยมคางหมูหรือสามเหลี่ยมจำลองสนามจริง
      const coneShape = new fabric.Polygon([
        { x: 0, y: -size/2 },
        { x: -size/2, y: size/2 },
        { x: size/2, y: size/2 }
      ], {
        fill: cone.color || '#ff6b1a',
        stroke: '#fff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });

      const label = new fabric.Textbox(cone.name, {
        fontSize: 8,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fill: '#ffffff',
        backgroundColor: '#1e293b',
        originX: 'center',
        originY: 'top',
        top: size/2 + 2,
        textAlign: 'center'
      });

      // ตั้งค่า selectable: false และ evented: false เพื่อไม่ให้เผลอไปกดโดนหรือลากกรวยหลุดตำแหน่ง
      const coneGroup = new fabric.Group([coneShape, label], {
        left: x, top: y, originX: 'center', originY: 'center', selectable: false, evented: false
      });

      (coneGroup as any).id = cone.id;
      (coneGroup as any).isCone = true;

      conesGroups.current.set(cone.id, coneGroup);
      canvas.add(coneGroup);
    });

    canvas.renderAll();
  }, [cones, isPlaying, canvasConfig]);

  // เรนเดอร์ตัวละครนักแสดงสมาชิกในวง (Performers)
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    const currentSet = sets[currentSetIndex];
    if (!currentSet) return;

    performersGroups.current.forEach(group => canvas.remove(group));
    performersGroups.current.clear();

    const radius = 12; // ขนาดของวงกลมคนซ้อมเด่นชัด สังเกตง่าย

    performers.forEach((performer) => {
      const pos = currentSet.positions[performer.id] || { x: 0, y: 0 };
      const { x, y } = gridToCanvas(pos.x, pos.y, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      
      const isSelected = selectedPerformerId === performer.id;

      const circle = new fabric.Circle({ 
        radius: radius, fill: performer.color, originX: 'center', originY: 'center', stroke: isSelected ? '#22d3ee' : '#ffffff', strokeWidth: isSelected ? 2.5 : 1.2 
      });
      
      const label = new fabric.Textbox(performer.symbol, { 
        fontSize: radius * 1.1, fill: '#fff', originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold'
      });
      
      const group = new fabric.Group([circle, label], { 
        left: x, top: y, originX: 'center', originY: 'center', hasControls: false, hasBorders: isSelected, borderColor: '#22d3ee', hoverCursor: 'grab', moveCursor: 'grabbing'
      });
      
      group.id = performer.id;
      (group as any).isCone = false;
      performersGroups.current.set(performer.id, group);
      canvas.add(group);

      if (isSelected) {
        canvas.setActiveObject(group);
      }
    });

    canvas.renderAll();
  }, [performers, currentSetIndex, sets, isPlaying, selectedPerformerId, canvasConfig]);

  // ระบบเล่น Animation สมูทตามเส้นเวลา (LERP)
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || !isPlaying || sets.length === 0) return;

    canvas.discardActiveObject();

    const cumulative: number[] = [];
    cumulative[0] = (sets[0]?.duration) || 0;
    for (let i = 1; i < sets.length; i++) {
      cumulative[i] = (cumulative[i - 1] || 0) + (sets[i].duration || 0);
    }

    let idx = sets.length - 1;
    for (let i = 0; i < cumulative.length; i++) {
      if (currentTime <= cumulative[i]) {
        idx = i;
        break;
      }
    }

    const setA = idx > 0 ? sets[idx - 1] : sets[0];
    const setB = sets[idx] || sets[sets.length - 1];

    const startTime = idx > 0 ? cumulative[idx - 1] : 0;
    const endTime = cumulative[idx] || startTime;
    let t = 0;
    const denom = endTime - startTime;
    if (denom > 0) t = (currentTime - startTime) / denom;
    t = Math.max(0, Math.min(1, t));

    performersGroups.current.forEach((group, id) => {
      const posA = setA.positions[id] || { x: 0, y: 0 };
      const posB = setB.positions[id] || posA;

      const interpX = posA.x + (posB.x - posA.x) * t;
      const interpY = posA.y + (posB.y - posA.y) * t;

      const { x, y } = gridToCanvas(interpX, interpY, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      group.set({ left: x, top: y });
      group.setCoords();
    });

    canvas.renderAll();
  }, [currentTime, isPlaying, sets, canvasConfig]);

  return (
    // 🛠️ คลุมสไตล์ข้างนอกด้วย Tailwind ให้ยืดเต็มหน้าจอได้อย่างสมดุล 
    // ตัวเฟรมภายในจะครอบกระดานสัดส่วนสี่เหลี่ยมผืนผ้าคงที่ไว้ ทำให้ไม่ว่าหน้าจอคอมฯ ผู้ใช้งานจะกว้างหรือแคบแค่ไหน อัตราส่วนพิกัดก็จะไม่เบี้ยว บิด หรือพังอีกต่อไปครับ
    <div className="w-full h-full bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-5xl aspect-[2/1] bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
        <div style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }} className="scale-[0.9] sm:scale-[0.95] md:scale-100 origin-center transition-transform">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default MarchingCanvas;