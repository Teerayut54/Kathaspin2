import React, { useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import MarchingCanvas from './MarchingCanvas';
import { useAudioSync } from '../hooks/useAudioSync';

const Layout: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const { setAudioFile, removeAudio, togglePlay, stop, hasAudio } = useAudioSync(waveformRef);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* 1. Header */}
      <Header togglePlay={togglePlay} stop={stop} />
      
      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-slate-700 bg-slate-800 flex flex-col shrink-0 overflow-hidden">
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
      <div className="h-44 border-t border-slate-700 bg-slate-800 shrink-0 flex flex-col">
        <BottomPanel 
          waveformRef={waveformRef} 
          handleAudioUpload={handleAudioUpload} 
          hasAudio={hasAudio} 
          removeAudio={removeAudio} 
        />
      </div>
    </div>
  );
}

export default Layout;