import React from 'react';
import { useProjectStore } from '../store/projectStore';
import { Trash2, UserPlus, Clock, MapPin } from 'lucide-react'; // เพิ่มไอคอน MapPin สำหรับฟังก์ชันกรวยสนาม

const Sidebar: React.FC = () => {
  // --- 🌟 State & Actions จาก Store เดิม ---
  const performers = useProjectStore(state => state.data.performers);
  const sets = useProjectStore(state => state.data.sets);
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const canvasConfig = useProjectStore(state => state.canvasConfig);
  
  const addPerformer = useProjectStore(state => state.addPerformer);
  const removePerformer = useProjectStore(state => state.removePerformer);
  const updatePerformer = useProjectStore(state => state.updatePerformer);
  
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  const updateSetTitle = useProjectStore(state => state.updateSetTitle);
  const updateSetDuration = useProjectStore(state => state.updateSetDuration);
  const updateCanvasSize = useProjectStore(state => state.updateCanvasSize);

  // --- 🌟 State & Actions เพิ่มเติมสำหรับระบบกรวยสนาม ---
  const cones = useProjectStore(state => state.cones) || []; // ดึงรายการกรวย (ใส่ fallback ป้องกันพัง)
  const generateConeByCoords = useProjectStore(state => state.generateConeByCoords);
  const updateConePosition = useProjectStore(state => state.updateConePosition);
  const removeCone = useProjectStore(state => state.removeCone);

  // สเตตควบคุมสำหรับฟอร์มกรอกตัวเลขวางกรวยด่วนภายในแผงควบคุม
  const [inputX, setInputX] = React.useState<string>('12');
  const [inputY, setInputY] = React.useState<string>('8');
  const [coneLabel, setConeLabel] = React.useState<string>('');

  const currentSet = sets[currentSetIndex];

  // --- ➕ ฟังก์ชันเพิ่มขบวนนักแสดงใหม่แบบรันเลขอัตโนมัติ ---
  const handleAddPerformer = () => {
    const pPerformers = performers.filter(p => p.id.startsWith('P'));
    const nextNumber = pPerformers.length + 1;
    const newId = `P${nextNumber.toString().padStart(2, '0')}`;

    const defaultColors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const assignedColor = defaultColors[performers.length % defaultColors.length];

    const newPerformer = {
      id: newId,
      name: `Trumpet ${nextNumber}`,
      color: assignedColor,
      symbol: 'x'
    };

    addPerformer(newPerformer);
    setSelectedPerformerId(newId);
  };

  // --- ➕ ฟังก์ชันสั่งยิงพิกัดไปสร้างกรวยลงสนาม ---
  const handleCreateCone = () => {
    const targetX = Number(inputX) || 0;
    const targetY = Number(inputY) || 0;
    
    // คำนวณชื่อตั้งต้นกรณีผู้ใช้ปล่อยว่างไว้ (เช่น กรวยพิกัดด่วน "L12" หรือ "R12")
    let autoLabel = coneLabel.trim();
    if (!autoLabel) {
      if (targetX < 0) autoLabel = `L${Math.abs(targetX)}`;
      else if (targetX > 0) autoLabel = `R${targetX}`;
      else autoLabel = `CTR`;
    }

    if (generateConeByCoords) {
      generateConeByCoords(targetX, targetY, autoLabel);
      setConeLabel(''); // เคลียร์ช่องกรอกข้อความหลังกดยิงสร้างเสร็จเรียบร้อย
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-r border-slate-800 text-slate-100 select-none">
      
      {/* 🔝 ส่วนบน: หัวข้อแถบข้างพร้อมปุ่มกดเพิ่มนักแสดง */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 shrink-0">
        <h3 className="font-bold text-sm text-slate-300">Performers ({performers.length})</h3>
        <button
          onClick={handleAddPerformer}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition shadow-md shadow-cyan-500/10"
        >
          <UserPlus size={14} />
          <span>เพิ่มคน</span>
        </button>
      </div>

      {/* 📜 ส่วนกลาง: รายการการ์ดนักแสดงทั้งหมด */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {performers.map((p) => {
          const position = currentSet?.positions?.[p.id] || { x: 0, y: 0 };
          const isSelected = selectedPerformerId === p.id;
          const coordinateText = `X: ${position.x.toFixed(1)}, Y: ${position.y.toFixed(1)}`;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPerformerId(p.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 font-bold text-cyan-400">
                    {p.id}
                  </span>
                  <input
                    type="text"
                    value={p.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updatePerformer(p.id, { name: e.target.value })}
                    className="bg-transparent font-medium text-xs focus:outline-none focus:border-b border-slate-500 w-28 text-slate-100"
                  />
                </div>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removePerformer(p.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 transition p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold" 
                    style={{ backgroundColor: p.color }}
                  >
                    {p.symbol}
                  </div>
                  <span className="text-slate-400">พิกัดปัจจุบัน:</span>
                </div>
                <span className="text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/60">
                  {coordinateText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛠️ ส่วนล่าง: Inspector Panel ประกอบด้วยแผงควบคุมหลัก 3 ส่วน */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4 shrink-0 shadow-2xl max-h-[60%] overflow-y-auto">
        
        {/* 📝 ส่วนที่ 1: Set Properties (ตั้งชื่อเซ็ตปัจจุบัน และ ปรับเวลาวินาที) */}
        {currentSet && (
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
              Set Properties (เซ็ตปัจจุบัน)
            </label>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
              <span className="text-[11px] text-purple-400 block font-bold">
                Set #{currentSetIndex + 1}
              </span>
              
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">ชื่อเซ็ต:</span>
                <input 
                  type="text"
                  value={currentSet.title || ''}
                  onChange={(e) => updateSetTitle(currentSetIndex, e.target.value)}
                  placeholder="กรอกชื่อเซ็ตที่นี่..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">ระยะเวลา (วินาที):</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center flex-1">
                    <input 
                      type="number"
                      min={currentSetIndex === 0 ? "0" : "0.5"}
                      max="60"
                      step="0.5"
                      disabled={currentSetIndex === 0}
                      value={currentSet.duration}
                      onChange={(e) => updateSetDuration(currentSetIndex, Number(e.target.value))}
                      className="w-full pl-7 pr-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Clock size={12} className="absolute left-2 text-slate-500" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">วินาที (s)</span>
                </div>
                {currentSetIndex === 0 && (
                  <p className="text-[9px] text-slate-500 mt-0.5">* เซ็ตเริ่มต้นถูกล็อกไว้ที่ 0.0s</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🛠️ ส่วนที่ 2: Cone Management (เพิ่มระบบวางและกรอกตัวเลขกรวยสนาม) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Cone Management (จัดการกรวยสนาม)
          </label>
          
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[9px] text-slate-400 block mb-0.5">ชื่อป้ายกรวย:</span>
                <input 
                  type="text" 
                  placeholder="เช่น L12, R16"
                  value={coneLabel}
                  onChange={(e) => setConeLabel(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[9px] text-amber-400 font-bold block mb-0.5">พิกัด X:</span>
                <input 
                  type="number" 
                  value={inputX}
                  onChange={(e) => setInputX(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[9px] text-amber-400 font-bold block mb-0.5">พิกัด Y:</span>
                <input 
                  type="number" 
                  value={inputY}
                  onChange={(e) => setInputY(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleCreateCone}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] py-1.5 rounded flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/10"
            >
              <MapPin size={12} />
              <span>+ วางจุดกรวยลงสนาม</span>
            </button>
          </div>

          {/* ตารางสกรอลล์สรุปและปรับแก้ตัวเลขกรวยแบบแมนนวล */}
          {cones.length > 0 && (
            <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1 mt-1 border border-slate-800/40 rounded bg-slate-950/40 p-1">
              {cones.map((cone) => (
                <div key={cone.id} className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800 text-[11px] gap-1">
                  <span className="font-bold text-amber-400 font-mono w-12 truncate">{cone.name}</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-slate-500 text-[10px]">X:</span>
                    <input 
                      type="number"
                      value={cone.x}
                      onChange={(e) => updateConePosition && updateConePosition(cone.id, Number(e.target.value), cone.y)}
                      className="w-10 bg-slate-950 border border-slate-800 rounded px-1 text-center text-white text-[11px]"
                    />
                    <span className="text-slate-500 text-[10px]">Y:</span>
                    <input 
                      type="number"
                      value={cone.y}
                      onChange={(e) => updateConePosition && updateConePosition(cone.id, cone.x, Number(e.target.value))}
                      className="w-10 bg-slate-950 border border-slate-800 rounded px-1 text-center text-white text-[11px]"
                    />
                  </div>
                  <button
                    onClick={() => removeCone && removeCone(cone.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎛️ ส่วนที่ 3: Canvas Size (ระบบสไลเดอร์ปรับขนาด Canvas สนามเดิม) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Canvas Size (ขนาดสนาม)
          </label>
          
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">ความกว้าง (X):</span>
              <span className="text-cyan-400 font-mono font-bold">{canvasConfig.width}px</span>
            </div>
            <input 
              type="range" 
              min="800" 
              max="2400" 
              step="100"
              value={canvasConfig.width}
              onChange={(e) => updateCanvasSize(Number(e.target.value), canvasConfig.height)}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">ความลึก (Y):</span>
              <span className="text-cyan-400 font-mono font-bold">{canvasConfig.height}px</span>
            </div>
            <input 
              type="range" 
              min="400" 
              max="1200" 
              step="50"
              value={canvasConfig.height}
              onChange={(e) => updateCanvasSize(canvasConfig.width, Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;