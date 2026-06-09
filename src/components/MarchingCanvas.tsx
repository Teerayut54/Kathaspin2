import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, 
  gridToCanvas, canvasToGrid, snapToInterval 
} from '../core/gridMath';
import { useProjectStore } from '../store/projectStore';

const MarchingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const performersGroups = useRef<Map<string, fabric.Group>>(new Map());
  
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const sets = useProjectStore(state => state.data.sets);
  const performers = useProjectStore(state => state.data.performers);
  
  const isPlaying = useProjectStore(state => state.isPlaying);
  const currentTime = useProjectStore(state => state.currentTime);
  
  // 👈 ดึง State การเลือกนักแสดงมาใช้งานบน Canvas
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  // 1. Initialize Canvas and Draw Grid (Runs Once)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      selection: true, // Group selection
    });
    fabricCanvas.current = canvas;

    drawGrid(canvas);

    // Live Snap while dragging
    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      
      const target = e.target;
      if (!target) return;
      
      const { gridX, gridY } = canvasToGrid(target.left || 0, target.top || 0);
      const { x, y } = gridToCanvas(snapToInterval(gridX, 0.5), snapToInterval(gridY, 0.5));
      target.set({ left: x, top: y });
    });

    // Save state when drag ends
    canvas.on('object:modified', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      
      const target = e.target as any;
      if (!target) return;

      if (target.type === 'activeSelection') {
        const activeSelection = target as fabric.ActiveSelection;
        activeSelection.forEachObject((obj: any) => {
           if (obj.id) updatePosition(obj);
        });
      } else if (target.id) {
        updatePosition(target);
      }
    });

    // 🛠️ ตรวจจับการคลิกเลือกวัตถุบน Canvas เพื่อไฮไลท์ฝั่ง Sidebar ซ้าย
    const handleSelection = (e: any) => {
      if (e.selected && e.selected.length === 1) {
        const targetObj = e.selected[0];
        if (targetObj && targetObj.id) {
          setSelectedPerformerId(targetObj.id);
        }
      } else {
        // หากเลือกหลายคนพร้อมกัน หรือไม่ได้เลือกใคร ให้ล้างค่าไฮไลท์
        setSelectedPerformerId(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedPerformerId(null));

    return () => {
      canvas.dispose();
      performersGroups.current.clear();
    };
  }, [setSelectedPerformerId]); // ปลอดภัยตามหลัก React Hooks

  const updatePosition = (obj: any) => {
    const { gridX, gridY } = canvasToGrid(obj.left || 0, obj.top || 0);
    const finalGridX = snapToInterval(gridX, 0.5);
    const finalGridY = snapToInterval(gridY, 0.5);
    
    const { x, y } = gridToCanvas(finalGridX, finalGridY);
    obj.set({ left: x, top: y });
    obj.setCoords();
    
    useProjectStore.getState().updateSetPositions(
      useProjectStore.getState().currentSetIndex,
      obj.id, 
      finalGridX, 
      finalGridY
    );
  };

  const drawGrid = (canvas: fabric.Canvas) => {
    for (let i = 0; i <= 12; i++) {
      const { y } = gridToCanvas(0, i);
      canvas.add(new fabric.Line([0, y, CANVAS_WIDTH, y], { 
        stroke: i % 4 === 0 ? '#334155' : '#1e293b', 
        selectable: false, evented: false 
      }));
      if (i > 0) {
        canvas.add(new fabric.Textbox(i.toString(), { 
          left: 5, top: y - 20, fontSize: 12, fill: '#64748b', selectable: false, evented: false 
        }));
      }
    }
    for (let i = -12; i <= 12; i++) {
      const { x } = gridToCanvas(i, 0);
      canvas.add(new fabric.Line([x, 0, x, CANVAS_HEIGHT], { 
        stroke: i === 0 ? '#475569' : '#1e293b', 
        selectable: false, evented: false 
      }));
      const label = i === 0 ? '0' : (i > 0 ? `R${i}` : `L${Math.abs(i)}`);
      canvas.add(new fabric.Textbox(label, { 
        left: x + 4, top: CANVAS_HEIGHT - 20, fontSize: 12, fill: '#64748b', selectable: false, evented: false 
      }));
    }
  };

  // 2. Editing Mode: Render objects from current Set State
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    const currentSet = sets[currentSetIndex];
    if (!currentSet) return;

    performersGroups.current.forEach(group => canvas.remove(group));
    performersGroups.current.clear();

    performers.forEach((performer) => {
      const pos = currentSet.positions[performer.id] || { x: 0, y: 0 };
      const { x, y } = gridToCanvas(pos.x, pos.y);
      
      // 🛠️ เช็กสถานะว่าถูกเลือกอยู่หรือไม่เพื่อปรับสีขอบจุดบนสนาม
      const isSelected = selectedPerformerId === performer.id;

      const circle = new fabric.Circle({ 
        radius: 10, 
        fill: performer.color, 
        originX: 'center', 
        originY: 'center', 
        // สีนีออนฟ้าเมื่อถูกเลือก / สีขาวเมื่อปกติ
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
        hasBorders: isSelected, // แสดงกล่องเส้นประครอบเฉพาะตอนเลือก
        borderColor: '#22d3ee',
        hoverCursor: 'grab', 
        moveCursor: 'grabbing'
      });
      
      // ผูกไอดีไว้ที่ตัว Group ของนักแสดงคนนั้นๆ
      (group as any).id = performer.id;
      performersGroups.current.set(performer.id, group);
      canvas.add(group);

      // 🛠️ หากคนนี้ถูกเลือกจากฝั่งซ้าย ให้ Fabric.js ทำการครอบสัญลักษณ์การเลือก (Active Object) บนจอทันที
      if (isSelected) {
        canvas.setActiveObject(group);
      }
    });

    canvas.renderAll();
  }, [performers, currentSetIndex, sets, isPlaying, selectedPerformerId]); // เฝ้าดูสเตตการเลือกคน

  // 3. Playback Mode: LERP Animation
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

    // 🛠️ แอนิเมชันคำนวณเซ็ตเป้าหมาย (setB) ให้ถูกต้องตามช่วงวินาทีจริง ไม่พุ่งทะลุไปเซ็ตสุดท้าย
    const setA = idx > 0 ? sets[idx - 1] : sets[0];
    const setB = sets[idx] || sets[sets.length - 1]; // 👈 แก้ไขจากเดิมที่เป็น sets[sets.length - 1]

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
      
      const { x, y } = gridToCanvas(interpX, interpY);
      group.set({ left: x, top: y });
      group.setCoords();
    });

    canvas.renderAll();
  }, [currentTime, isPlaying, sets]);

  return (
    <div className={`relative shadow-2xl rounded-xl overflow-hidden bg-[#0f172a] border border-slate-700 ring-4 transition-all ${isPlaying ? 'ring-purple-500 shadow-purple-900/30' : 'ring-slate-900/50'}`}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default MarchingCanvas;
