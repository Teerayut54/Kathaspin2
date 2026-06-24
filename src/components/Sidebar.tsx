import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { Trash2, UserPlus, Clock, MapPin, Users, Settings2, Grid, ChevronLeft, Settings, Layers, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';

const Sidebar: React.FC = () => {
  const performers = useProjectStore(state => state.data.performers);
  const sets = useProjectStore(state => state.data.sets);
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const canvasConfig = useProjectStore(state => state.canvasConfig);
  
  const addPerformer = useProjectStore(state => state.addPerformer);
  const removePerformer = useProjectStore(state => state.removePerformer);
  const updatePerformer = useProjectStore(state => state.updatePerformer);
  const movePerformer = useProjectStore(state => state.movePerformer);
  
  const selectedPerformerId = useProjectStore(state => state.selectedPerformerId);
  const setSelectedPerformerId = useProjectStore(state => state.setSelectedPerformerId);

  const updateSetTitle = useProjectStore(state => state.updateSetTitle);
  const updateSetDuration = useProjectStore(state => state.updateSetDuration);
  const updateGridDimensions = useProjectStore(state => state.updateGridDimensions);

  const cones = useProjectStore(state => state.cones) || []; 
  const generateConeByCoords = useProjectStore(state => state.generateConeByCoords);
  const updateConePosition = useProjectStore(state => state.updateConePosition);
  const removeCone = useProjectStore(state => state.removeCone);

  const [inputX, setInputX] = useState<string>('12');
  const [inputY, setInputY] = useState<string>('8');
  const [coneLabel, setConeLabel] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'performers' | 'sets' | 'cones' | 'grid'>('performers');
  const [manageLayersActive, setManageLayersActive] = useState(false);
  const [editModeId, setEditModeId] = useState<string | null>(null);

  const currentSet = sets[currentSetIndex];

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
      baseShape: 'circle' as const,
      innerContentType: 'icon' as const,
      innerContentValue: 'X'
    };

    addPerformer(newPerformer);
    setSelectedPerformerId(newId);
  };

  const handleCreateCone = () => {
    const targetX = Number(inputX) || 0;
    const targetY = Number(inputY) || 0;
    
    let autoLabel = coneLabel.trim();
    if (!autoLabel) {
      if (targetX < 0) autoLabel = `L${Math.abs(targetX)}`;
      else if (targetX > 0) autoLabel = `R${targetX}`;
      else autoLabel = `CTR`;
    }

    if (generateConeByCoords) {
      generateConeByCoords(targetX, targetY, autoLabel);
      setConeLabel(''); 
    }
  };

  return (
    <div className="flex h-full relative text-slate-100 select-none bg-slate-900 border-r border-slate-700">
      
      {/* 🟢 Thin Icon Sidebar */}
      <div className="w-16 bg-slate-950 flex flex-col items-center py-4 gap-4 z-30 shrink-0 border-r border-slate-800">
        <button 
          onClick={() => setActiveTab('performers')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'performers' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          title="Performers"
        ><Users size={20} /></button>
        <button 
          onClick={() => setActiveTab('sets')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'sets' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          title="Set Properties"
        ><Settings2 size={20} /></button>
        <button 
          onClick={() => setActiveTab('cones')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'cones' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          title="Cone Management"
        ><MapPin size={20} /></button>
        <button 
          onClick={() => setActiveTab('grid')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'grid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          title="Field Grid Size"
        ><Grid size={20} /></button>
      </div>

      {/* 🟢 Drawer Panel */}
      <div className={`w-64 bg-slate-900 flex flex-col h-full shrink-0 transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 shrink-0 h-[52px]">
          <h3 className="font-bold text-sm text-slate-200 truncate pr-2">
            {activeTab === 'performers' && `Performers (${performers.length})`}
            {activeTab === 'sets' && 'Set Properties'}
            {activeTab === 'cones' && 'Cone Management'}
            {activeTab === 'grid' && 'Field Grid Size'}
          </h3>
          {activeTab === 'performers' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setManageLayersActive(!manageLayersActive)}
                className={`px-2 py-1.5 rounded transition ${manageLayersActive ? 'bg-indigo-600 text-white shadow-inner' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                title="Manage Layers"
              >
                <Layers size={14} />
              </button>
              <button
                onClick={handleAddPerformer}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition shadow-md shadow-cyan-500/10"
              >
                <UserPlus size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          
          {/* ================= TAB 1: PERFORMERS ================= */}
          {activeTab === 'performers' && (
            <div className="flex flex-col gap-2">
              {/* Note: Map iterates in native index order, which is perfect since the array acts as our Z-Index source of truth */}
              {performers.map((p) => {
                const position = currentSet?.positions?.[p.id] || { x: 0, y: 0 };
                const isSelected = selectedPerformerId === p.id;
                const availableIcons = ['X', 'O', '★', '♦', '+', '-'];
                const quickColors = ['#22c55e', '#3b82f6', '#ec4899', '#f59e0b', '#a855f7', '#ef4444'];

                const renderPreviewInner = () => {
                  if (p.innerContentType === 'none') return null;
                  return p.innerContentValue;
                };

                return (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPerformerId(p.id)} 
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col ${
                      isSelected ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/10' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {/* ส่วนหัว: ID, Name, Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-bold" style={{ borderLeft: `3px solid ${p.color}` }}>{p.id}</span>
                        <input 
                          type="text" 
                          value={p.name} 
                          onClick={(e) => e.stopPropagation()} 
                          onChange={(e) => updatePerformer(p.id, { name: e.target.value })} 
                          className="bg-transparent font-medium text-xs focus:outline-none focus:border-b border-slate-500 w-24 truncate" 
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditModeId(editModeId === p.id ? null : p.id); }} 
                          className={`p-1 rounded transition ${editModeId === p.id ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:bg-slate-700 hover:text-white'}`}
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removePerformer(p.id); }} 
                          className="p-1 text-slate-500 hover:bg-slate-700 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* ส่วนแสดงข้อมูลพิกัดย่อ (Fixed height unless expanded) */}
                    <div className="flex items-center justify-between text-[11px] font-mono mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className={`w-5 h-5 flex items-center justify-center text-[10px] text-white font-bold shadow-inner ${
                            p.baseShape === 'circle' ? 'rounded-full' : p.baseShape === 'square' ? 'rounded-sm' : p.baseShape === 'triangle' ? 'clip-triangle' : 'clip-diamond'
                          }`} 
                          style={{ backgroundColor: p.color, clipPath: p.baseShape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : p.baseShape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none' }}
                        >
                          {renderPreviewInner()}
                        </div>
                        <span className="text-slate-400">Pos:</span>
                      </div>
                      <span className="text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/60">
                        X:{position.x.toFixed(1)}, Y:{position.y.toFixed(1)}
                      </span>
                    </div>

                    {/* 🛠️ Edit Tools Panel (Slide down drawer inside the card) */}
                    {editModeId === p.id && (
                      <div className="mt-2 p-2 bg-slate-900/90 rounded border border-slate-700/50 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        
                        {/* 1. Base Shape Picker */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 min-w-[50px]">รูปทรง:</span>
                          <div className="flex gap-1 flex-wrap">
                            {['circle', 'square', 'triangle', 'diamond'].map(shape => (
                              <button
                                key={shape}
                                onClick={() => updatePerformer(p.id, { baseShape: shape as any })}
                                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center transition ${
                                  p.baseShape === shape ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {shape === 'circle' && 'O'}
                                {shape === 'square' && '■'}
                                {shape === 'triangle' && '▲'}
                                {shape === 'diamond' && '♦'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Inner Content Type Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 min-w-[50px]">ด้านใน:</span>
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => updatePerformer(p.id, { innerContentType: 'none', innerContentValue: '' })}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center transition ${
                                p.innerContentType === 'none' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >None</button>
                            <button
                              onClick={() => updatePerformer(p.id, { innerContentType: 'number', innerContentValue: '1' })}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center transition ${
                                p.innerContentType === 'number' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >Number</button>
                            <button
                              onClick={() => updatePerformer(p.id, { innerContentType: 'icon', innerContentValue: 'X' })}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center transition ${
                                p.innerContentType === 'icon' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >Icon</button>
                          </div>
                        </div>

                        {/* 3. Conditional Input/Picker for Inner Content */}
                        {p.innerContentType === 'number' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 min-w-[50px]">หมายเลข:</span>
                            <input 
                              type="text" 
                              maxLength={3} 
                              value={p.innerContentValue || ''} 
                              onChange={(e) => updatePerformer(p.id, { innerContentValue: e.target.value })} 
                              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white text-center focus:outline-none focus:border-cyan-400" 
                              placeholder="1" 
                            />
                          </div>
                        )}

                        {p.innerContentType === 'icon' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 min-w-[50px]">ไอคอน:</span>
                            <div className="flex gap-1 flex-wrap">
                              {availableIcons.map((sym) => (
                                <button
                                  key={sym}
                                  onClick={() => updatePerformer(p.id, { innerContentValue: sym })}
                                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition ${
                                    p.innerContentValue === sym ? 'bg-amber-500 text-slate-950 scale-110' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >{sym}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* เลือกสี */}
                        <div className="flex items-center gap-2 mt-1 border-t border-slate-700/50 pt-2">
                          <span className="text-[10px] text-slate-400 min-w-[50px]">เปลี่ยนสี:</span>
                          <div className="flex items-center gap-1 flex-wrap flex-1">
                            {quickColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => updatePerformer(p.id, { color: color })}
                                className={`w-4 h-4 rounded-full border transition ${
                                  p.color === color ? 'border-white scale-125 shadow-md ring-1 ring-cyan-400' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <input 
                              type="color" 
                              value={p.color} 
                              onChange={(e) => updatePerformer(p.id, { color: e.target.value })}
                              className="w-5 h-5 p-0 bg-transparent border-0 cursor-pointer rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 📚 Layering Controls */}
                    {manageLayersActive && (
                      <div className="mt-2 flex items-center justify-between bg-indigo-950/40 rounded border border-indigo-500/30 p-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => movePerformer(p.id, 'front')} className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded flex-1 flex justify-center transition" title="Bring to Front"><ChevronsUp size={14} /></button>
                        <button onClick={() => movePerformer(p.id, 'forward')} className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded flex-1 flex justify-center transition" title="Bring Forward"><ChevronUp size={14} /></button>
                        <div className="w-px h-4 bg-indigo-500/30 mx-1"></div>
                        <button onClick={() => movePerformer(p.id, 'backward')} className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded flex-1 flex justify-center transition" title="Send Backward"><ChevronDown size={14} /></button>
                        <button onClick={() => movePerformer(p.id, 'back')} className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded flex-1 flex justify-center transition" title="Send to Back"><ChevronsDown size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= TAB 2: SETS ================= */}
          {activeTab === 'sets' && currentSet && (
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
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-purple-500 transition"
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
                      className="w-full pl-7 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <Clock size={12} className="absolute left-2 text-slate-500" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">วินาที (s)</span>
                </div>
                {currentSetIndex === 0 && (
                  <p className="text-[9px] text-slate-500 mt-1">* เซ็ตเริ่มต้นถูกล็อกไว้ที่ 0.0s</p>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: CONES ================= */}
          {activeTab === 'cones' && (
            <div className="space-y-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block mb-1">ชื่อป้ายกรวย:</span>
                    <input 
                      type="text" 
                      placeholder="เช่น L12"
                      value={coneLabel}
                      onChange={(e) => setConeLabel(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-bold block mb-1">พิกัด X:</span>
                    <input 
                      type="number" 
                      value={inputX}
                      onChange={(e) => setInputX(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-bold block mb-1">พิกัด Y:</span>
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
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] py-2 rounded flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/10"
                >
                  <MapPin size={12} />
                  <span>+ วางจุดกรวยลงสนาม</span>
                </button>
              </div>

              {cones.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-2">จุดกรวยปัจจุบัน</label>
                  {cones.map((cone) => (
                    <div key={cone.id} className="flex items-center justify-between bg-slate-900/60 px-2 py-2 rounded border border-slate-800 text-[11px] gap-1">
                      <span className="font-bold text-amber-400 font-mono w-10 truncate">{cone.name}</span>
                      <div className="flex items-center gap-1 font-mono flex-1 justify-center">
                        <span className="text-slate-500 text-[10px]">X:</span>
                        <input 
                          type="number"
                          value={cone.x}
                          onChange={(e) => updateConePosition && updateConePosition(cone.id, Number(e.target.value), cone.y)}
                          className="w-9 bg-slate-950 border border-slate-800 rounded px-1 text-center text-white text-[11px]"
                        />
                        <span className="text-slate-500 text-[10px] ml-1">Y:</span>
                        <input 
                          type="number"
                          value={cone.y}
                          onChange={(e) => updateConePosition && updateConePosition(cone.id, cone.x, Number(e.target.value))}
                          className="w-9 bg-slate-950 border border-slate-800 rounded px-1 text-center text-white text-[11px]"
                        />
                      </div>
                      <button
                        onClick={() => removeCone && removeCone(cone.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: GRID ================= */}
          {activeTab === 'grid' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">ขอบกว้าง (X-Max):</span>
                  <input
                    type="number"
                    min={4}
                    value={canvasConfig.gridMaxX}
                    onChange={(e) => updateGridDimensions(Number(e.target.value || 4), canvasConfig.gridMaxY)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">ขอบซ้ายขวากว้าง L{canvasConfig.gridMaxX} ถึง R{canvasConfig.gridMaxX}</p>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">ระยะลึก (Y-Max):</span>
                  <input
                    type="number"
                    min={4}
                    value={canvasConfig.gridMaxY}
                    onChange={(e) => updateGridDimensions(canvasConfig.gridMaxX, Number(e.target.value || 4))}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">ความลึกสนามเข้าหาฉากหลัง {canvasConfig.gridMaxY} ช่อง</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Sidebar;