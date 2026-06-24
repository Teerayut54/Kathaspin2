import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { Music, Plus } from 'lucide-react';

interface BottomPanelProps {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasAudio: boolean;
  removeAudio: () => void;
  currentTime: number;
  duration: number;
}

const BottomPanel: React.FC<BottomPanelProps> = ({ 
  waveformRef, handleAudioUpload, hasAudio, removeAudio, currentTime, duration 
}) => {
  const sets = useProjectStore(state => state.data.sets);
  const addSet = useProjectStore(state => state.addSet);
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const setCurrentSetIndex = useProjectStore(state => state.setCurrentSetIndex);
  const updateSetDuration = useProjectStore(state => state.updateSetDuration);
  const setCurrentTime = useProjectStore(state => state.setCurrentTime);
  
  const copySet = useProjectStore(state => state.copySet); 
  const removeSet = useProjectStore(state => state.removeSet); 

  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<{ setIndex: number; startX: number; startDuration: number } | null>(null);

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    addSet({
      setNumber: sets.length,
      title: `Set ${sets.length}`,
      duration: 8,
      positions: lastSet ? JSON.parse(JSON.stringify(lastSet.positions)) : {}
    });
    setCurrentSetIndex(sets.length);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizing || !timelineTrackRef.current || duration <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedPercentage = clickX / rect.width;
    const clickedSeconds = clickedPercentage * duration;
    setCurrentTime(Math.min(Math.max(clickedSeconds, 0), duration));
  };

  React.useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      if (!timelineTrackRef.current || duration <= 0) return;
      const rect = timelineTrackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - resizing.startX;
      const deltaPercentage = deltaX / rect.width;
      const deltaSeconds = deltaPercentage * duration;
      const newDuration = Math.max(0.5, resizing.startDuration + deltaSeconds);
      updateSetDuration(resizing.setIndex, newDuration);
    };

    const onUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, duration, updateSetDuration]);

  let accumulatedLeftPercent = 0;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-2 flex flex-col gap-2 select-none">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded cursor-pointer text-xs font-bold text-slate-200 flex items-center gap-2 transition">
            <Music size={14} />
            <span>{hasAudio ? "เปลี่ยนไฟล์เสียง" : "อัปโหลดเสียง"}</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>

          {hasAudio && (
            <button
              onClick={removeAudio}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs px-2 py-1.5 rounded font-bold transition flex items-center gap-1"
              title="ลบไฟล์เพลงออกและใช้ตัวจำลองเวลาแทน"
            >
              ❌ ลบ
            </button>
          )}

          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 ml-2">
            เวลา: <span className="text-cyan-400 font-bold text-sm w-12 text-right">{currentTime.toFixed(2)}s</span>
            {duration > 0 && <span className="text-slate-500">/ {duration.toFixed(2)}s</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => copySet(currentSetIndex)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition"
          >
            📋 คัดลอกเซ็ต
          </button>

          <button 
            onClick={() => removeSet(currentSetIndex)}
            disabled={currentSetIndex === 0}
            className={`text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition ${
              currentSetIndex === 0 
                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
                : 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800'
            }`}
          >
            🗑️ ลบ
          </button>

          <button onClick={handleAddSet} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition">
            <Plus size={14} /> เพิ่มเซ็ต
          </button>
        </div>
      </div>

      <div className="relative bg-slate-900 rounded border border-slate-700 p-1.5 overflow-x-auto min-h-[80px]">
        <div style={{ minWidth: `${Math.max(duration * 30, 800)}px` }} className="relative w-full h-full flex flex-col gap-1">
          
          {/* 🌟 Unified Playhead */}
          <div 
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none transition-all duration-75 z-30"
          >
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-white rounded-full shadow-md" />
          </div>

          {/* Waveform Track (Reduced Height) */}
          <div className={`relative w-full h-[40px] shrink-0 ${hasAudio ? 'block' : 'hidden'}`}>
            <div ref={waveformRef} className="w-full h-full opacity-60 pointer-events-none" />
          </div>

          {/* Timeline Track (Reduced Height) */}
          <div 
            ref={timelineTrackRef}
            onClick={handleTimelineClick}
            className="relative h-10 w-full border-t border-slate-800 cursor-pointer shrink-0"
          >
            {sets.map((set, idx) => {
              const blockWidthPercent = duration > 0 ? (set.duration / duration) * 100 : 0;
              const currentLeftPercent = accumulatedLeftPercent;
              accumulatedLeftPercent += blockWidthPercent;

              const isSelected = currentSetIndex === idx;

              return (
                <div
                  key={set.setNumber}
                  style={{ left: `${currentLeftPercent}%`, width: `${blockWidthPercent}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSetIndex(idx);
                  }}
                  className={`absolute h-8 top-1 rounded border flex items-center justify-between px-2 text-[10px] group transition-colors ${
                    isSelected 
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 z-10' 
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-bold truncate pointer-events-none">
                    {set.title} ({set.duration.toFixed(1)}s)
                  </span>

                  {idx > 0 && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizing({
                          setIndex: idx,
                          startX: e.clientX,
                          startDuration: set.duration,
                        });
                      }}
                      className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>
              );
            })}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default BottomPanel;