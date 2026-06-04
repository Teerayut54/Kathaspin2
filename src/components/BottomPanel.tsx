import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { Music, Plus } from 'lucide-react';

interface BottomPanelProps {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasAudio: boolean;
  removeAudio: () => void; // 👈 เพิ่มสิ่งนี้เข้ามา
}

const PPS = 30; // พิกเซลต่อหนึ่งวินาทีบนหน้าจอ

const BottomPanel: React.FC<BottomPanelProps> = ({ waveformRef, handleAudioUpload, hasAudio, removeAudio }) => {
  const currentTime = useProjectStore(state => state.currentTime);
  const sets = useProjectStore(state => state.data.sets);
  const addSet = useProjectStore(state => state.addSet);
  const currentSetIndex = useProjectStore(state => state.currentSetIndex);
  const setCurrentSetIndex = useProjectStore(state => state.setCurrentSetIndex);
  const updateSetDuration = useProjectStore(state => state.updateSetDuration);
  const setCurrentTime = useProjectStore(state => state.setCurrentTime);
  
  // เพิ่มตัวแปรสำหรับดึงฟังก์ชันจาก store
  const copySet = useProjectStore(state => state.copySet); 
  const removeSet = useProjectStore(state => state.removeSet); 

  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<{ setId: string; startX: number; startWidth: number } | null>(null);

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    addSet({
      setNumber: sets.length,
      title: `Set ${sets.length}`,
      duration: 8, // ค่าเริ่มต้น 8 วินาทีสำหรับเซ็ตใหม่
      positions: lastSet ? JSON.parse(JSON.stringify(lastSet.positions)) : {}
    });
    setCurrentSetIndex(sets.length);
  };

  // ดักจับฟังก์ชันคลิกแถบไทม์ไลน์เพื่อกระโดดข้ามเวลา (Manual scrubbing)
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizing || !timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedSeconds = clickX / PPS;
    setCurrentTime(clickedSeconds);
  };

  React.useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX;
      const deltaSeconds = deltaX / PPS;
      const newDuration = Math.max(0.5, (resizing.startWidth / PPS) + deltaSeconds);
      updateSetDuration(resizing.setId, newDuration);
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
  }, [resizing, updateSetDuration]);

  // คำนวณหาตำแหน่งสะสมเพื่อวาดกล่อง Set วางต่อกันตามแนวนอน
  let accumulatedLeft = 0;

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-4 flex flex-col gap-4 select-none">
      
      {/* โซนการจัดส่งข้อมูลเสียง และปุ่มจัดการ Set */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded cursor-pointer text-xs font-bold text-slate-200 flex items-center gap-2 transition">
            <Music size={14} />
            <span>{hasAudio ? "เปลี่ยนไฟล์เสียง (.mp3)" : "อัปโหลดเสียงประกอบ"}</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>

          {/* 🛠️ ปุ่มลบเพลงสีแดง (จะแสดงผลขึ้นมาเฉพาะตอนที่ตรวจเจอไฟล์เพลงเท่านั้น) */}
          {hasAudio && (
            <button
              onClick={removeAudio}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs px-2.5 py-1.5 rounded font-bold transition flex items-center gap-1"
              title="ลบไฟล์เพลงออกและใช้ตัวจำลองเวลาแทน"
            >
              ❌ ลบเพลงออก
            </button>
          )}

          <span className="text-xs text-slate-400 font-mono">
            เวลาปัจจุบัน: <span className="text-cyan-400 font-bold text-sm">{currentTime.toFixed(2)}s</span>
          </span>
        </div>
        
        {/* 🛠️ แผงปุ่มจัดการเซ็ตขบวนแปรแถว */}
        <div className="flex items-center gap-2">
          {/* ปุ่มคัดลอกเซ็ต (จะคัดลอกข้อมูลพิกัดของเซ็ตที่เลือกอยู่ ณ ปัจจุบันบน Canvas) */}
          <button 
            onClick={() => copySet(currentSetIndex)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition"
            title="ก๊อปปี้ตำแหน่งจากเซ็ตปัจจุบันไปสร้างเป็นเซ็ตใหม่ต่อท้ายสุด"
          >
            📋 คัดลอกเซ็ต
          </button>

          {/* ปุ่มลบเซ็ต (จะซ่อน/ปิดการทำงานในกรณีที่เป็นเซ็ต 0 เพื่อเซฟระบบพัง) */}
          <button 
            onClick={() => removeSet(currentSetIndex)}
            disabled={currentSetIndex === 0}
            className={`text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition ${
              currentSetIndex === 0 
                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
                : 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800'
            }`}
          >
            🗑️ ลบเซ็ต
          </button>

          <button onClick={handleAddSet} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 transition">
            <Plus size={14} /> เพิ่มเซ็ตใหม่
          </button>
        </div>
      </div>

      {/* บล็อกสนามไทม์ไลน์ปรับเปลี่ยนขนาดโครงสร้างรูป */}
      <div className="relative bg-slate-900 rounded border border-slate-700 p-2 overflow-x-auto min-h-[120px]">
        
        {/* แถบคลื่นเสียงจาก Wavesurfer */}
        <div ref={waveformRef} className={`w-full ${hasAudio ? 'block opacity-60' : 'hidden'}`} />

        {/* แทร็กสำหรับสร้างตำแหน่งและบล็อกยืดหด */}
        <div 
          ref={timelineTrackRef}
          onClick={handleTimelineClick}
          className="relative h-14 mt-2 w-full border-t border-slate-800 cursor-pointer"
        >
          {sets.map((set, idx) => {
            const blockWidth = set.duration * PPS;
            const currentLeft = accumulatedLeft;
            accumulatedLeft += blockWidth; // ทบระยะเพิ่มขึ้นเพื่อวางต่อจากขอบเดิม

            const isSelected = currentSetIndex === idx;

            return (
              <div
                key={set.setNumber}
                style={{ left: `${currentLeft}px`, width: `${blockWidth}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSetIndex(idx);
                }}
                className={`absolute h-10 top-2 rounded border flex items-center justify-between px-2 text-xs group transition-colors ${
                  isSelected 
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200' 
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="font-bold truncate pointer-events-none">
                  {set.title} ({set.duration.toFixed(1)}s)
                </span>

                {/* ตัวดึงปรับแต่งขอบขวาของกล่อง (Resize Handle) */}
                {idx > 0 && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizing({
                        setId: set.setNumber.toString(),
                        startX: e.clientX,
                        startWidth: blockWidth,
                      });
                    }}
                    className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </div>
            );
          })}

          {/* แถบสีแดงแสดงตำแหน่งปัจจุบัน (Playhead Marker) */}
          <div 
            style={{ left: `${currentTime * PPS}px` }}
            className="absolute top-0 w-0.5 h-14 bg-red-500 shadow-lg pointer-events-none transition-all duration-75"
          >
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomPanel;