import React, { useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import MarchingCanvas from './MarchingCanvas';
import { useAudioSync } from '../hooks/useAudioSync';

const Layout: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  // 👈 ดึง removeAudio ออกมาจากตัวแปรตรงนี้
  const { setAudioFile, removeAudio, togglePlay, stop, hasAudio } = useAudioSync(waveformRef);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* 1. Header (ควบคุมการเล่นแอนิเมชันหลักจากด้านบน) */}
      <Header togglePlay={togglePlay} stop={stop} />
      
      {/* 2. Main Workspace (Sidebar + Canvas) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Performers) */}
        <div className="w-64 border-r border-slate-700 bg-slate-800 flex flex-col shrink-0 overflow-hidden">
          <Sidebar />
        </div>
        
        {/* Center Canvas */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative overflow-auto custom-scrollbar">
          <MarchingCanvas />
        </div>
      </div>
      
      {/* 3. Bottom Panel (ส่งฟังก์ชันอัปโหลดเพลง และพาสถานะมีเสียง/ไม่มีเสียงไปที่ตัวไทม์ไลน์) */}
      <div className="h-44 border-t border-slate-700 bg-slate-800 shrink-0 flex flex-col">
        {/* 👈 ส่ง removeAudio เข้าไปให้ BottomPanel */}
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
