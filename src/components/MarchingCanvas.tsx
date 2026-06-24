import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { gridToCanvas, canvasToGrid, snapToInterval } from '../core/gridMath';
import { useProjectStore } from '../store/projectStore';

const MarchingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const performersGroups = useRef<Map<string, fabric.Group>>(new Map());

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

  // 🛠️ State สลับมุมมอง
  const viewMode = useProjectStore(state => state.viewMode);
  const setViewMode = useProjectStore(state => state.setViewMode);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      selection: true,
    });
    fabricCanvas.current = canvas;

    canvas.clear();
    drawGrid(canvas, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target || target.isCone) return;

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
    };
  }, [canvasConfig.gridMaxX, canvasConfig.gridMaxY, setSelectedPerformerId]);

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

  const drawGrid = (canvas: fabric.Canvas, width: number, height: number, maxX: number, maxY: number) => {
    const fontSize = 10;
    const coneSize = 11;

    // ==========================================
    // 🧱 STEP 1: วาด "เส้นตารางทั้งหมด" ลงไปก่อน (อยู่เลเยอร์ล่างสุด)
    // ==========================================
    
    // วาดเส้นแนวนอน (แกน Y)
    for (let i = 0; i <= maxY; i++) {
      const { y } = gridToCanvas(0, i, width, height, maxX, maxY);
      canvas.add(new fabric.Line([0, y, width, y], {
        stroke: i % 4 === 0 ? '#334155' : '#1e293b',
        strokeWidth: i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
    }

    // วาดเส้นแนวตั้ง (แกน X)
    for (let i = -maxX; i <= maxX; i++) {
      const { x } = gridToCanvas(i, 0, width, height, maxX, maxY);
      canvas.add(new fabric.Line([x, 0, x, height], {
        stroke: i === 0 ? '#475569' : (i % 4 === 0 ? '#334155' : '#1e293b'),
        strokeWidth: i === 0 || i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
    }

    // ==========================================
    // 🎨 STEP 2: วาด "กรวยและป้ายพิกัด" ทีหลัง (จะลอยอยู่ด้านบนสุดหน้าเส้นกราฟ)
    // ==========================================

    // พ่นวัตถุพิกัดของแกน Y (ซ้าย-ขวา)
    for (let i = 0; i <= maxY; i++) {
      if (i % 1 === 0) { // วาดทุกเส้นพิกัด
        const { y } = gridToCanvas(0, i, width, height, maxX, maxY);
        
        [-maxX, maxX].forEach((xPos) => {
          const { x } = gridToCanvas(xPos, i, width, height, maxX, maxY);
          
          // วาดกรวยแกน Y (ลอยทับหน้าเส้นตาราง)
          if (i !== 0 && i !== maxY) {
            const sideCone = new fabric.Polygon([
              { x: 0, y: -coneSize/2 }, { x: -coneSize/2, y: coneSize/2 }, { x: coneSize/2, y: coneSize/2 }
            ], {
              left: x, 
              top: y, 
              fill: '#ff6b1a', 
              stroke: '#fff', 
              strokeWidth: 0.8, 
              originX: 'center', 
              originY: 'center', 
              selectable: false, 
              evented: false
            });
            canvas.add(sideCone);
          }

          // วาดป้ายพิกัดแกน Y (ลอยทับหน้าเส้นตาราง)
          const sideLabel = new fabric.Textbox(`Y:${i}`, {
            left: x, 
            top: y, 
            fontSize: fontSize, 
            fontWeight: 'bold',
            fill: '#e2e8f0', 
            fontFamily: 'monospace', 
            originX: 'center',
            originY: 'center', 
            textAlign: 'center',
            selectable: false, 
            evented: false,
            textBackgroundColor: 'rgba(11, 15, 25, 0.85)' 
          });
          canvas.add(sideLabel);
        });
      }
    }

    // พ่นวัตถุพิกัดของแกน X (บน-ล่าง)
    for (let i = -maxX; i <= maxX; i++) {
      const { x, y: bottomY } = gridToCanvas(i, 0, width, height, maxX, maxY);
      const { y: topY } = gridToCanvas(i, maxY, width, height, maxX, maxY);
      
      const label = i === 0 ? '0' : (i > 0 ? `R${i}` : `L${Math.abs(i)}`);
      const isCenter = i === 0;

      [bottomY, topY].forEach((yPos) => {
        // วาดกรวยแกน X (ลอยทับหน้าเส้นตาราง)
        const markerCone = new fabric.Polygon([
          { x: 0, y: -coneSize/2 }, { x: -coneSize/2, y: coneSize/2 }, { x: coneSize/2, y: coneSize/2 }
        ], {
          left: x, 
          top: yPos, 
          fill: isCenter ? '#0ea5e9' : '#ff6b1a', 
          stroke: '#fff', 
          strokeWidth: 0.8, 
          originX: 'center', 
          originY: 'center', 
          selectable: false, 
          evented: false
        });
        
        // วาดป้ายพิกัดแกน X (ลอยทับหน้าเส้นตาราง)
        const markerLabel = new fabric.Textbox(label, {
          left: x, 
          top: yPos, 
          fontSize: fontSize + 1, 
          fontWeight: 'bold',
          fill: isCenter ? '#38bdf8' : '#e2e8f0', 
          fontFamily: 'monospace', 
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          selectable: false, 
          evented: false,
          textBackgroundColor: 'rgba(11, 15, 25, 0.85)'
        });
        canvas.add(markerCone, markerLabel);
      });
    }
  };

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    const currentSet = sets[currentSetIndex];
    if (!currentSet) return;

    performersGroups.current.forEach(group => canvas.remove(group));
    performersGroups.current.clear();

    const radius = 9.5; // ลดรัศมีจาก 12 เป็น 9.5 เพื่อลดการซ้อนทับ

    performers.forEach((performer) => {
      const pos = currentSet.positions[performer.id] || { x: 0, y: 0 };
      const { x, y } = gridToCanvas(pos.x, pos.y, CANVAS_WIDTH, CANVAS_HEIGHT, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      
      const isSelected = selectedPerformerId === performer.id;

      const circle = new fabric.Circle({ 
        radius: radius, fill: performer.color, originX: 'center', originY: 'center', stroke: isSelected ? '#22d3ee' : '#ffffff', strokeWidth: isSelected ? 2 : 1.2 
      });
      
      const label = new fabric.Textbox(performer.symbol, { 
        fontSize: radius * 1.2, fill: '#fff', originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold'
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
    // 🏟️ ใช้โครงสร้าง Layout ดั้งเดิมของคุณเป๊ะๆ เพื่อให้สัดส่วน 3D กลับมาสวยเหมือนเดิม
    <div className="relative w-full h-full bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden [perspective:1000px]">
      
      {/* 🌟 ปุ่มสลับมุมมอง (ฝังลอยไว้มุมขวาบนของหน้าจอหลัก ไม่กวน Layout สนาม) */}
      <div className="absolute top-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === '2D' ? '3D' : '2D')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-lg ${
            viewMode === '3D'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          {viewMode === '3D' ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-5.25v9" /></svg>
              มุมมอง 3D บนสแตนด์
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75zm16.5 4.5H3.75m16.5 4.5H3.75m16.5 4.5H3.75" /></svg>
              มุมมอง 2D แผนผัง
            </>
          )}
        </button>
      </div>

      {/* 🛠️ ส่วนแผ่นสนาม: สลับสไตล์บิดมุมมองตามสไตล์ที่คุณต้องการ ไม่ยืด ไม่เบี้ยว */}
      <div 
        className="w-full max-w-5xl aspect-[2/1] bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500"
        style={
          viewMode === '3D' 
            ? {
                transform: 'rotateX(35deg) scale(0.9) translateY(-20px)',
                transformStyle: 'preserve-3d',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }
            : {
                transform: 'rotateX(0deg) scale(1) translateY(0px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }
        }
      >
        <div style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }} className="origin-center">
          <canvas ref={canvasRef} />
        </div>
      </div>

    </div>
  );
};

export default MarchingCanvas;