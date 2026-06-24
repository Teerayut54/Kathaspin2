import React, { useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import MarchingCanvas from './MarchingCanvas';
import { useAudioSync } from '../hooks/useAudioSync';
import { useProjectStore } from '../store/projectStore';

const Layout: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const { setAudioFile, removeAudio, togglePlay, stop, hasAudio, audioDuration } = useAudioSync(waveformRef);

  const currentTime = useProjectStore(state => state.currentTime);
  const sets = useProjectStore(state => state.data.sets);
  
  // Single Source of Truth for Duration
  const setsDuration = sets.reduce((sum, s) => sum + s.duration, 0);
  const unifiedDuration = hasAudio && audioDuration > 0 ? audioDuration : setsDuration;

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* 1. Header */}
      <Header togglePlay={togglePlay} stop={stop} />
      
      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Dynamic Width) */}
        <div className="shrink-0 flex h-full z-20 border-r border-slate-700 bg-slate-800">
          <Sidebar />
        </div>
        
        {/* Center Canvas (ยืดขยายเต็ม 100% ไร้ Overflow บังคับวาดกระดานชนขอบกล่องพอดี) */}
        <div className="flex-1 bg-slate-950 p-4 flex overflow-hidden">
          <div className="flex-1 w-full border border-slate-800 rounded-xl bg-[#0f172a] shadow-inner overflow-hidden">
            <MarchingCanvas />
          </div>
        </div>
      </div>
      
      {/* 3. Bottom Panel */}
      <div className="border-t border-slate-700 bg-slate-800 shrink-0 flex flex-col">
        <BottomPanel 
          waveformRef={waveformRef} 
          handleAudioUpload={handleAudioUpload} 
          hasAudio={hasAudio} 
          removeAudio={removeAudio}
          currentTime={currentTime}
          duration={unifiedDuration}
        />
      </div>
    </div>
  );
}

export default Layout;