import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { gridToCanvas, canvasToGrid, snapToInterval, getDynamicScale } from '../core/gridMath';
import { useProjectStore } from '../store/projectStore';

const MarchingCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const performersGroups = useRef<Map<string, fabric.Group>>(new Map());
  const conesGroups = useRef<Map<string, fabric.Group>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const sets = useProjectStore(state => state.data.sets);
  const performers = useProjectStore(state => state.data.performers);
  
  const isPlaying = useProjectStore(state => state.isPlaying);
  const currentTime = useProjectStore(state => state.currentTime);
  
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  const canvasConfig = useProjectStore(state => state.canvasConfig);
  const cones = useProjectStore(state => state.cones) || [];
  const updateConePosition = useProjectStore(state => state.updateConePosition);

  // ตรวจจับขนาดกล่องครอบนอกสุด เพื่อให้ได้ค่าขนาดพิกเซลจริงของหน้าจอฝั่งขวา
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // ปรับขนาดพิกเซล Canvas จริงให้เต็มพื้นที่กล่อง โดยมีขนาดขั้นต่ำรองรับจอเล็ก
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.max(200, width), height: Math.max(150, height) });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // วาดและเคลียร์กระดาน Canvas เมื่อมิติหน้าจอ หรือจำนวนบล็อกตารางมีการเปลี่ยนแปลง
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      selection: true,
    });
    fabricCanvas.current = canvas;

    drawGrid(canvas, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

    canvas.on('object:moving', (e) => {
      if (useProjectStore.getState().isPlaying) return;
      const target = e.target as any;
      if (!target) return;

      const { gridX, gridY } = canvasToGrid(
        target.left || 0, target.top || 0,
        dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY
      );

      const { x, y } = gridToCanvas(
        snapToInterval(gridX, 0.5), snapToInterval(gridY, 0.5),
        dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY
      );
      target.set({ left: x, top: y });
    });

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

  const drawGrid = (canvas: fabric.Canvas, width: number, height: number, maxX: number, maxY: number) => {
    const scale = getDynamicScale(width, height, maxX, maxY);
    const fontSize = Math.max(8, Math.min(11, scale * 0.38)); // ปรับขนาดตัวอักษรบอกพิกเซลกราฟตามสเกลสนาม

    // Horizontal lines (Y)
    for (let i = 0; i <= maxY; i++) {
      const { y } = gridToCanvas(0, i, width, height, maxX, maxY);
      canvas.add(new fabric.Line([0, y, width, y], {
        stroke: i % 4 === 0 ? '#334155' : '#1e293b',
        strokeWidth: i % 4 === 0 ? 1.5 : 1,
        selectable: false, evented: false
      }));
      if (i > 0) {
        canvas.add(new fabric.Textbox(i.toString(), {
          left: 10, top: y - (fontSize + 2), fontSize: fontSize, fill: '#64748b', fontFamily: 'monospace', selectable: false, evented: false
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
      
      const bottomY = gridToCanvas(0, 0, width, height, maxX, maxY).y;
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

  // Render Cones
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    conesGroups.current.forEach(group => canvas.remove(group));
    conesGroups.current.clear();

    const scale = getDynamicScale(dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    const size = Math.max(10, scale * 0.4); // ขนาดกรวยแปรผันตามอัตราซูมหน้าจอ

    cones.forEach((cone) => {
      const { x, y } = gridToCanvas(cone.x, cone.y, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);

      const coneShape = new fabric.Polygon([
        { x: 0, y: -size/2 },
        { x: -size/2, y: size/2 },
        { x: size/2, y: size/2 }
      ], {
        fill: cone.color || '#f59e0b',
        stroke: '#fff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });

      const label = new fabric.Textbox(cone.name, {
        fontSize: Math.max(7, size * 0.5),
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fill: '#fcd34d',
        backgroundColor: '#0f172aee',
        originX: 'center',
        originY: 'top',
        top: size/2 + 2,
        textAlign: 'center'
      });

      const coneGroup = new fabric.Group([coneShape, label], {
        left: x, top: y, originX: 'center', originY: 'center', hasControls: false, hasBorders: true, borderColor: '#f59e0b', hoverCursor: 'pointer', moveCursor: 'move'
      });

      (coneGroup as any).id = cone.id;
      (coneGroup as any).isCone = true;

      conesGroups.current.set(cone.id, coneGroup);
      canvas.add(coneGroup);
    });

    canvas.renderAll();
  }, [cones, isPlaying, dimensions, canvasConfig]);

  // Render Performers
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas || isPlaying) return;

    const currentSet = sets[currentSetIndex];
    if (!currentSet) return;

    performersGroups.current.forEach(group => canvas.remove(group));
    performersGroups.current.clear();

    const scale = getDynamicScale(dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
    const radius = Math.max(7, scale * 0.35); // รัศมีวงกลมนักแสดงแปรผันอย่างเหมาะสม ไม่ให้ดูล้นตาราง

    performers.forEach((performer) => {
      const pos = currentSet.positions[performer.id] || { x: 0, y: 0 };
      const { x, y } = gridToCanvas(pos.x, pos.y, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      
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
  }, [performers, currentSetIndex, sets, isPlaying, selectedPerformerId, dimensions, canvasConfig]);

  // Playback Mode LERP
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

      const { x, y } = gridToCanvas(interpX, interpY, dimensions.width, dimensions.height, canvasConfig.gridMaxX, canvasConfig.gridMaxY);
      group.set({ left: x, top: y });
      group.setCoords();
    });

    canvas.renderAll();
  }, [currentTime, isPlaying, sets, dimensions, canvasConfig]);

  return (
    // เปลี่ยนมาผูก ref ไว้ที่ Div นอกสุดเพื่อให้มันดักจับมิติพื้นที่ฝั่งขวาของ Browser ได้เต็ม 100% จริงๆ
    <div 
      ref={containerRef}
      className={`w-full h-full bg-[#0f172a] flex items-center justify-center transition-all ${
        isPlaying ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-900/10' : ''
      }`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default MarchingCanvas;
