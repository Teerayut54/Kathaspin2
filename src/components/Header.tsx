import React from 'react';
import { useProjectStore } from '../store/projectStore';
import { Download, Upload, Play, Pause, Square } from 'lucide-react';

interface HeaderProps {
  togglePlay: () => void;
  stop: () => void;
}

const Header: React.FC<HeaderProps> = ({ togglePlay, stop }) => {
  const metadata = useProjectStore(state => state.data.metadata);
  const updateMetadata = useProjectStore(state => state.updateMetadata);
  const data = useProjectStore(state => state.data);
  const setData = useProjectStore(state => state.setData);
  const isPlaying = useProjectStore(state => state.isPlaying);

  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.projectName.replace(/\s+/g, '_')}_Kathaspin.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData && importedData.metadata && importedData.sets) {
          setData(importedData);
        } else {
          alert('Invalid JSON structure.');
        }
      } catch (error) {
        alert('Failed to parse JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 shadow-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
          Kathaspin Pro
        </h1>
        <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
        <input 
          type="text"
          value={metadata.projectName}
          onChange={(e) => updateMetadata({ projectName: e.target.value })}
          className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none px-1 py-0.5 text-sm w-48 text-slate-200"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded flex items-center gap-2 text-sm transition-colors border border-slate-600">
            <Upload size={16} />
            <span>Import</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-900/20"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="bg-blue-600 hover:bg-blue-500 w-10 h-10 rounded flex items-center justify-center"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={stop}
            className="bg-slate-700 hover:bg-slate-600 w-10 h-10 rounded flex items-center justify-center"
            title="Stop"
          >
            <Square size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
