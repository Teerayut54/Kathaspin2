import { create } from 'zustand';

export interface Metadata {
  projectName: string;
}

export interface Performer {
  id: string;
  name: string;
  color: string;
  symbol: string;
}

export interface SetPositions {
  [performerId: string]: { x: number; y: number };
}

export interface SetData {
  setNumber: number;
  title: string;
  duration: number;
  positions: SetPositions;
}

export interface ProjectData {
  metadata: Metadata;
  performers: Performer[];
  sets: SetData[];
}

export interface CanvasConfig {
  gridMaxX: number; // จำนวนบล็อกตารางฝั่งขวา (เช่น 16)
  gridMaxY: number; // จำนวนบล็อกตารางแนวลึก (เช่น 16)
}

export interface Cone {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface ProjectState {
  data: ProjectData;
  currentSetIndex: number; 
  currentTime: number;
  isPlaying: boolean;
  selectedPerformerId: string | null;
  canvasConfig: CanvasConfig; 
  
  // 🟢 เพิ่ม State สำหรับ Zoom
  zoomRatio: number;
  setZoomRatio: (zoom: number) => void;

  // ปรับขนาดสนามโดยระบุจำนวนบล็อกตารางในแกน X และ Y
  updateGridDimensions: (maxX: number, maxY: number) => void;

  setData: (data: ProjectData) => void;
  updateMetadata: (meta: Partial<Metadata>) => void;

  addPerformer: (performer: Performer) => void;
  updatePerformer: (id: string, updates: Partial<Performer>) => void;
  removePerformer: (id: string) => void;

  addSet: (set: SetData) => void;
  updateSetPositions: (setIndex: number, performerId: string, x: number, y: number) => void;
  updateSetTitle: (setIndex: number, title: string) => void; 
  updateSetDuration: (setIndex: number, newDuration: number) => void; 

  setCurrentSetIndex: (index: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;

  copySet: (setIndex: number) => void;
  removeSet: (setIndex: number) => void;

  setSelectedPerformerId: (id: string | null) => void;
  // pixel-based canvas sizing removed; use responsive container + grid dimensions

  cones: Cone[]; 
  addCone: (cone: Cone) => void;
  removeCone: (id: string) => void;
  updateConePosition: (id: string, x: number, y: number) => void;
  generateConeByCoords: (x: number, y: number, name?: string) => void; 
}

export const useProjectStore = create<ProjectState>((set) => ({
  data: {
    metadata: { projectName: 'My Marching Show' },
    performers: [
      { id: 'P01', name: 'Trumpet 1', color: '#ef4444', symbol: 'x' },
      { id: 'C01', name: 'Drum Major', color: '#3b82f6', symbol: 'o' }
    ],
    sets: [
      {
        setNumber: 0,
        title: 'Start',
        duration: 0, 
        positions: {
          'P01': { x: -3, y: 4 },
          'C01': { x: 0, y: 2 }
        }
      },
      {
        setNumber: 1,
        title: 'First Move',
        duration: 16,
        positions: {
          'P01': { x: 3, y: 8 },
          'C01': { x: 0, y: 5 }
        }
      }
    ]
  },
  currentSetIndex: 0,
  currentTime: 0,
  isPlaying: false,
  selectedPerformerId: null,
  
  canvasConfig: {
    gridMaxX: 16,
    gridMaxY: 16,
  },

  // 🟢 ค่าเริ่มต้นและ Logic ของ Zoom
  zoomRatio: 1,
  setZoomRatio: (zoom) => set({ zoomRatio: Math.max(0.2, Math.min(4, zoom)) }),

  updateGridDimensions: (maxX, maxY) => set(() => ({
    canvasConfig: {
      gridMaxX: Math.max(4, Math.floor(maxX)),
      gridMaxY: Math.max(4, Math.floor(maxY))
    }
  })),

  setData: (data) => set({ data }),

  updateMetadata: (meta) => set((state) => ({
    data: { ...state.data, metadata: { ...state.data.metadata, ...meta } }
  })),

  addPerformer: (performer) => set((state) => {
    const newSets = state.data.sets.map(s => ({
      ...s,
      positions: { ...s.positions, [performer.id]: { x: 0, y: 0 } }
    }));
    return {
      data: { ...state.data, performers: [...state.data.performers, performer], sets: newSets }
    };
  }),

  updatePerformer: (id, updates) => set((state) => ({
    data: {
      ...state.data,
      performers: state.data.performers.map(p => p.id === id ? { ...p, ...updates } : p)
    }
  })),

  removePerformer: (id) => set((state) => {
    const newSets = state.data.sets.map(s => {
      const newPos = { ...s.positions };
      delete newPos[id];
      return { ...s, positions: newPos };
    });
    return {
      data: {
        ...state.data,
        performers: state.data.performers.filter(p => p.id !== id),
        sets: newSets
      },
      selectedPerformerId: state.selectedPerformerId === id ? null : state.selectedPerformerId,
    };
  }),

  addSet: (newSet) => set((state) => ({
    data: { ...state.data, sets: [...state.data.sets, newSet] }
  })),

  updateSetPositions: (setIndex, performerId, x, y) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      newSets[setIndex].positions = {
        ...newSets[setIndex].positions,
        [performerId]: { x, y }
      };
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  updateSetDuration: (setIndex, newDuration) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      newSets[setIndex].duration = setIndex === 0 ? 0 : Math.max(0.5, newDuration);
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  updateSetTitle: (setIndex, title) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      newSets[setIndex].title = title;
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  setCurrentSetIndex: (index) => set({ currentSetIndex: index }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  copySet: (setIndex) => set((state) => {
    const currentSets = state.data.sets;
    const setToCopy = currentSets[setIndex];
    if (!setToCopy) return {};

    const duplicatedPositions = JSON.parse(JSON.stringify(setToCopy.positions));

    const newSet: SetData = {
      setNumber: currentSets.length,
      title: `${setToCopy.title} (Copy)`,
      duration: setToCopy.duration || 8,
      positions: duplicatedPositions
    };

    return {
      data: { ...state.data, sets: [...currentSets, newSet] },
      currentSetIndex: currentSets.length
    };
  }),

  removeSet: (setIndex) => set((state) => {
    const currentSets = state.data.sets;

    if (setIndex === 0 || currentSets.length <= 1) {
      alert("ไม่สามารถลบเซ็ตเริ่มต้นได้");
      return {};
    }

    const filteredSets = currentSets.filter((_, idx) => idx !== setIndex);
    const reindexedSets = filteredSets.map((s, idx) => ({ ...s, setNumber: idx }));
    const nextActiveIndex = Math.max(0, setIndex - 1);

    return {
      data: { ...state.data, sets: reindexedSets },
      currentSetIndex: nextActiveIndex,
      currentTime: 0
    };
  }),

  setSelectedPerformerId: (id) => set({ selectedPerformerId: id }),

  // removed: pixel-based updateCanvasSize — canvas pixel sizing handled in component

  cones: [
    { id: 'cone-1', name: 'L12', x: -12, y: 8, color: '#ff6b1a' },
    { id: 'cone-2', name: 'R12', x: 12, y: 8, color: '#ff6b1a' }
  ],

  addCone: (cone) => set((state) => ({ cones: [...state.cones, cone] })),

  removeCone: (id) => set((state) => ({
    cones: state.cones.filter(c => c.id !== id)
  })),

  updateConePosition: (id, x, y) => set((state) => ({
    cones: state.cones.map(c => c.id === id ? { ...c, x, y } : c)
  })),

  generateConeByCoords: (x, y, name) => set((state) => {
    const nextNum = state.cones.length + 1;
    const newCone: Cone = {
      id: `cone-${Date.now()}`,
      name: name || `กรวย ${nextNum}`,
      x: x,
      y: y,
      color: '#ff6b1a' 
    };
    return { cones: [...state.cones, newCone] };
  }),
}));