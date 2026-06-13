import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { gridToCanvas, canvasToGrid, snapToInterval } from '../core/gridMath';
import { useProjectStore } from '../store/projectStore';

const MarchingCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const performersGroups = useRef<Map<string, fabric.Group>>(new Map());
  const conesGroups = useRef<Map<string, fabric.Group>>(new Map()); // 🛠️ เก็บ Object กรวยจำลองแยกเลเยอร์
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const sets = useProjectStore(state => state.data.sets);
  const performers = useProjectStore(state => state.data.performers);
  
  const isPlaying = useProjectStore(state => state.isPlaying);
  const currentTime = useProjectStore(state => state.currentTime);
  
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  const canvasConfig = useProjectStore(state => state.canvasConfig);

  // 🛠️ ดึงชุดข้อมูลสเตตกรวยสนามมาจาก Store เพิ่มเติม
  const cones = useProjectStore(state => state.cones) || [];
  const updateConePosition = useProjectStore(state => state.updateConePosition);

  // Responsive container observer — update pixel dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.max(200, width - 16), height: Math.max(150, height - 16) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Initialize Canvas and Draw Grid when pixel dimensions or grid config change
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      selection: true,
    });
    fabricCanvas.current = canvas;

    // วาดตารางตามจำนวนบล็อกใน Store และขนาดพิกเซลปัจจุบัน
    drawGrid(canvas, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

    // Live snap while dragging
    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target) return;

      const { gridX, gridY } = canvasToGrid(
        target.left || 0,
        target.top || 0,
        dimensions.width,
        dimensions.height,
        canvasConfig.gridMaxX,
        canvasConfig.gridMaxY
      );

      const { x, y } = gridToCanvas(
        snapToInterval(gridX, 0.5),
        snapToInterval(gridY, 0.5),
        dimensions.width,
        dimensions.height,
        canvasConfig.gridMaxX,
        canvasConfig.gridMaxY
      );
      target.set({ left: x, top: y });
    });

    // Save when modified
    canvas.on('object:modified', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target) return;
      if (target.type === 'activeSelection') {
        const sel = target as fabric.ActiveSelection;
        sel.forEachObject((obj: any) => {
          if (obj.id) {
            if (obj.isCone) updateConeGridPosition(obj);
            else updatePosition(obj);
          }
        });
      } else if (target.id) {
        if (target.isCone) updateConeGridPosition(target);
        else updatePosition(target);
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
  }, [dimensions, canvasConfig.gridMaxX, canvasConfig.gridMaxY, setSelectedPerformerId]);

  // ฟังก์ชันอัปเดตตำแหน่งนักแสดง
  const updatePosition = (obj: any) => {
    const { gridX, gridY } = canvasToGrid(obj.left || 0, obj.top || 0, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    const finalGridX = snapToInterval(gridX, 0.5);
    const finalGridY = snapToInterval(gridY, 0.5);
    
    const { x, y } = gridToCanvas(finalGridX, finalGridY, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    obj.set({ left: x, top: y });
    obj.setCoords();
    
    useProjectStore.getState().updateSetPositions(
      useProjectStore.getState().currentSetIndex, obj.id, finalGridX, finalGridY
    );
  };

  // 🛠️ ฟังก์ชันเพิ่มเติม: อัปเดตพิกัดตำแหน่งกรวยสนามหลังจากการคลิกลากวางบน Canvas
  const updateConeGridPosition = (obj: any) => {
    const { gridX, gridY } = canvasToGrid(obj.left || 0, obj.top || 0, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    const finalGridX = snapToInterval(gridX, 0.5);
    const finalGridY = snapToInterval(gridY, 0.5);
    
    const { x, y } = gridToCanvas(finalGridX, finalGridY, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    obj.set({ left: x, top: y });
    obj.setCoords();
    
    if (updateConePosition) {
      updateConePosition(obj.id, finalGridX, finalGridY);
    }
  };

  // 🛠️ ปรับฟังก์ชันวาดตารางให้คำนวณจำนวนขอบโซนแบบไดนามิก (ขยายจาก 12 สู่ 16 หรือมากกว่าได้ทันที)
  const drawGrid = (canvas: fabric.Canvas, width: number, height: number, maxX: number, maxY: number) => {
    // Horizontal lines (Y)
    for (let i = 0; i <= maxY; i++) {
      const { x: _, y } = gridToCanvas(0, i, width, height, maxX, maxY);
      canvas.add(new fabric.Line([0, y, width, y], {
        stroke: i % 4 === 0 ? '#334155' : '#1e293b',
        strokeWidth: i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
      if (i > 0) {
        canvas.add(new fabric.Textbox(i.toString(), {
          left: 8, top: y - 16, fontSize: 10, fill: '#64748b', fontFamily: 'monospace', selectable: false, evented: false
        }));
      }
    }

    // Vertical lines (X)
    for (let i = -maxX; i <= maxX; i++) {
      const { x } = gridToCanvas(i, 0, width, height, maxX, maxY);
      canvas.add(new fabric.Line([x, 0, x, height], {
        stroke: i === 0 ? '#475569' : (i % 4 === 0 ? '#334155' : '#1e293b'),
        strokeWidth: i === 0 || i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
      const label = i === 0 ? '0' : (i > 0 ? `R${i}` : `L${Math.abs(i)}`);
      canvas.add(new fabric.Textbox(label, {
        left: x + 4, top: height - 18, fontSize: 10, fill: '#64748b', fontFamily: 'monospace', selectable: false, evented: false
      }));
    }
  };

  // 🛠️ Effect พิเศษเพิ่มเติม: การเรนเดอร์และจัดการวัตถุกรวย (Cones Render Layer)
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    // เคลียร์กรวยเซ็ตเดิมออกก่อนโหลดชุดข้อมูลตำแหน่งใหม่คัดสรร
    conesGroups.current.forEach(group => canvas.remove(group));
    conesGroups.current.clear();

    cones.forEach((cone) => {
      const { x, y } = gridToCanvas(cone.x, cone.y, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

      // สร้างหน้าตารูปทรงกรวยฝึกซ้อม (ใช้ SVG Path หรือวาดรูปทรง Polygon สามเหลี่ยมขึ้นด้านบน)
      const coneShape = new fabric.Polygon([
        { x: 0, y: -8 },  // ยอดแหลมกรวยสนาม
        { x: -7, y: 6 },  // ฐานซ้ายกรวย
        { x: 7, y: 6 }    // ฐานขวากรวย
      ], {
        fill: cone.color || '#f59e0b', // สีส้มสะท้อนแสงเด่นชัด
        stroke: '#fff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });

      // ป้ายข้อความหมายเลขอักษรกำกับกรวย (เช่น L12, R16)
      const label = new fabric.Textbox(cone.name, {
        fontSize: 9,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fill: '#fcd34d',
        backgroundColor: '#0f172aee',
        originX: 'center',
        originY: 'top',
        top: 8,
        textAlign: 'center'
      });

      const coneGroup = new fabric.Group([coneShape, label], {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: true,
        borderColor: '#f59e0b',
        hoverCursor: 'pointer',
        moveCursor: 'move'
      });

      // ผูก Flag พิเศษเพื่อให้แยกแยะอัปเดตสเตตใน Store ได้ถูกต้องไม่สับสนกับตัวนักแสดง
      (coneGroup as any).id = cone.id;
      (coneGroup as any).isCone = true;

      conesGroups.current.set(cone.id, coneGroup);
      
      // นำกรวยลงปักบนพื้นสนาม (เรนเดอร์ก่อนตัวคนเดินเพื่อให้อยู่เลเยอร์ด้านล่าง ไม่บังคน)
      canvas.add(coneGroup);
    });

    canvas.renderAll();
  }, [cones, isPlaying, canvasConfig]);

  // Editing Mode: Render Performers
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    const currentSet = sets[currentSetIndex];
    if (!currentSet) return;

    performersGroups.current.forEach(group => canvas.remove(group));
    performersGroups.current.clear();

    performers.forEach((performer) => {
      const pos = currentSet.positions[performer.id] || { x: 0, y: 0 };
      const { x, y } = gridToCanvas(pos.x, pos.y, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      
      const isSelected = selectedPerformerId === performer.id;

      const circle = new fabric.Circle({ 
        radius: 10, 
        fill: performer.color, 
        originX: 'center', 
        originY: 'center', 
        stroke: isSelected ? '#22d3ee' : '#ffffff', 
        strokeWidth: isSelected ? 3 : 1.5 
      });
      
      const label = new fabric.Textbox(performer.symbol, { 
        fontSize: 12, fill: '#fff', originX: 'center', originY: 'center', textAlign: 'center' 
      });
      
      const group = new fabric.Group([circle, label], { 
        left: x, 
        top: y, 
        originX: 'center', 
        originY: 'center', 
        hasControls: false, 
        hasBorders: isSelected, 
        borderColor: '#22d3ee',
        hoverCursor: 'grab', 
        moveCursor: 'grabbing'
      });
      
      group.id = performer.id;
      (group as any).isCone = false; // ชี้ชัดว่าเป็นนักแสดงไม่ใช่หมุดกรวย
      performersGroups.current.set(performer.id, group);
      canvas.add(group);

      if (isSelected) {
        canvas.setActiveObject(group);
      }
    });

    canvas.renderAll();
  }, [performers, currentSetIndex, sets, isPlaying, selectedPerformerId, canvasConfig]);

  // Playback Mode: LERP Animation
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
    if (denom > 0) {
      t = (currentTime - startTime) / denom;
    } else {
      t = 0;
    }
    t = Math.max(0, Math.min(1, t));

    performersGroups.current.forEach((group, id) => {
      const posA = setA.positions[id] || { x: 0, y: 0 };
      const posB = setB.positions[id] || posA;

      const interpX = posA.x + (posB.x - posA.x) * t;
      const interpY = posA.y + (posB.y - posA.y) * t;

      const { x, y } = gridToCanvas(interpX, interpY, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      group.set({ left: x, top: y });
      group.setCoords();
    });

    canvas.renderAll();
  }, [currentTime, isPlaying, sets, dimensions, canvasConfig.gridMaxX, canvasConfig.gridMaxY]);

  return (
    <div 
      className={`w-full h-[calc(100vh-280px)] overflow-auto border border-slate-700 rounded-xl bg-[#0f172a] shadow-inner p-4 custom-scrollbar ring-4 transition-all ${
        isPlaying ? 'ring-purple-500 shadow-purple-900/30' : 'ring-slate-900/50'
      }`}
    >
      <div className="mx-auto" style={{ width: dimensions.width, height: dimensions.height }} ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default MarchingCanvas;
