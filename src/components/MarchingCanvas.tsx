import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { gridToCanvas, canvasToGrid, snapToInterval } from '../core/gridMath';
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
  
  // ดึงสเตตการเลือกนักแสดงมาใช้งาน
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  // 🛠️ 1. ดึง config ขนาดสนามไดนามิกมาจาก Store แทนไฟล์คณิตศาสตร์เดิม
  const canvasConfig = useProjectStore(state => state.canvasConfig);

  // Initialize Canvas and Draw Grid
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // 🛠️ ปรับขนาด Canvas ตาม canvasConfig จากสเตต
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasConfig.width,
      height: canvasConfig.height,
      selection: true, // Group selection
    });
    fabricCanvas.current = canvas;

    // 🛠️ ส่งค่ามิติฝั่งสเตตไปให้ฟังก์ชันวาดตาราง
    drawGrid(canvas, canvasConfig.width, canvasConfig.height, canvasConfig.scale);

    // Live Snap while dragging
    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      
      const target = e.target;
      if (!target) return;
      
      // 🛠️ ส่งขนาดสนามเข้าฟังก์ชันคำนวณแบบไดนามิก
      const { gridX, gridY } = canvasToGrid(
        target.left || 0, target.top || 0, 
        canvasConfig.width, canvasConfig.height, canvasConfig.scale
      );
      const { x, y } = gridToCanvas(
        snapToInterval(gridX, 0.5), snapToInterval(gridY, 0.5), 
        canvasConfig.width, canvasConfig.height, canvasConfig.scale
      );
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

    // ตรวจจับการคลิกเลือกวัตถุบน Canvas
    const handleSelection = (e: any) => {
      if (e.selected && e.selected.length === 1) {
        const targetObj = e.selected[0];
        if (targetObj && targetObj.id) {
          setSelectedPerformerId(targetObj.id);
        }
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
    };
    // 🛠️ เฝ้าระวังเมื่อสไลเดอร์มีการเลื่อนหรือขนาดสนามเปลี่ยนไป
  }, [canvasConfig.width, canvasConfig.height, canvasConfig.scale, setSelectedPerformerId]);

  // ฟังก์ชันอัปเดตตำแหน่งเมื่อลากวางเสร็จ
  const updatePosition = (obj: any) => {
    // 🛠️ ส่งค่า config เข้าไปคำนวณพิกัดให้ถูกต้องตามขนาดสนามจริงขณะนั้น
    const { gridX, gridY } = canvasToGrid(
      obj.left || 0, obj.top || 0, 
      canvasConfig.width, canvasConfig.height, canvasConfig.scale
    );
    const finalGridX = snapToInterval(gridX, 0.5);
    const finalGridY = snapToInterval(gridY, 0.5);
    
    const { x, y } = gridToCanvas(
      finalGridX, finalGridY, 
      canvasConfig.width, canvasConfig.height, canvasConfig.scale
    );
    obj.set({ left: x, top: y });
    obj.setCoords();
    
    useProjectStore.getState().updateSetPositions(
      useProjectStore.getState().currentSetIndex,
      obj.id, 
      finalGridX, 
      finalGridY
    );
  };

  // 🛠️ ปรับฟังก์ชันวาดตารางให้รับ Parameter ไดนามิก
  const drawGrid = (canvas: fabric.Canvas, width: number, height: number, scale: number) => {
    // เส้นแนวนอน
    for (let i = 0; i <= 12; i++) {
      const { y } = gridToCanvas(0, i, width, height, scale);
      canvas.add(new fabric.Line([0, y, width, y], { 
        stroke: i % 4 === 0 ? '#334155' : '#1e293b', 
        selectable: false, evented: false 
      }));
      if (i > 0) {
        canvas.add(new fabric.Textbox(i.toString(), { 
          left: 5, top: y - 20, fontSize: 12, fill: '#64748b', selectable: false, evented: false 
        }));
      }
    }
    // เส้นแนวตั้ง
    for (let i = -12; i <= 12; i++) {
      const { x } = gridToCanvas(i, 0, width, height, scale);
      canvas.add(new fabric.Line([x, 0, x, height], { 
        stroke: i === 0 ? '#475569' : '#1e293b', 
        selectable: false, evented: false 
      }));
      const label = i === 0 ? '0' : (i > 0 ? `R${i}` : `L${Math.abs(i)}`);
      canvas.add(new fabric.Textbox(label, { 
        left: x + 4, top: height - 20, fontSize: 12, fill: '#64748b', selectable: false, evented: false 
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
      // 🛠️ ส่งค่า config ไปยังฟังก์ชันคำนวณตอนแสดงผลจุดนักแสดง
      const { x, y } = gridToCanvas(pos.x, pos.y, canvasConfig.width, canvasConfig.height, canvasConfig.scale);
      
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
      performersGroups.current.set(performer.id, group);
      canvas.add(group);

      if (isSelected) {
        canvas.setActiveObject(group);
      }
    });

    canvas.renderAll();
  }, [performers, currentSetIndex, sets, isPlaying, selectedPerformerId, canvasConfig]); // เพิ่ม canvasConfig เป็น Dependency

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
      
      // 🛠️ ส่งค่า config ไปใช้ในสูตรคำนวณการเคลื่อนไหวขณะเล่นแอนิเมชัน
      const { x, y } = gridToCanvas(interpX, interpY, canvasConfig.width, canvasConfig.height, canvasConfig.scale);
      group.set({ left: x, top: y });
      group.setCoords();
    });

    canvas.renderAll();
  }, [currentTime, isPlaying, sets, canvasConfig]); // เพิ่ม canvasConfig เป็น Dependency

  // 🛠️ 3. ครอบสไตล์กรอบภายนอกเพื่อล็อกสัดส่วน และเพิ่มกรอบสีม่วง/เทาตามสถานะ Playback เดิม
  return (
    <div 
      className={`w-full h-[calc(100vh-280px)] overflow-auto border border-slate-700 rounded-xl bg-[#0f172a] shadow-inner p-4 custom-scrollbar ring-4 transition-all ${
        isPlaying ? 'ring-purple-500 shadow-purple-900/30' : 'ring-slate-900/50'
      }`}
    >
      <div className="mx-auto" style={{ width: canvasConfig.width, height: canvasConfig.height }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default MarchingCanvas;
