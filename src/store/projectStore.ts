import { create } from 'zustand';

export interface Metadata {
  projectName: string;
}

export interface Performer {
  id: string;
  name: string;
  color: string;
  baseShape: 'circle' | 'square' | 'triangle' | 'diamond';
  innerContentType: 'none' | 'number' | 'icon';
  innerContentValue?: string;
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
  gridMaxX: number; // จำนวนบล็อกตารางฝั่งขวา (เช่น 12)
  gridMaxY: number; // จำนวนบล็อกตารางแนวลึก (เช่น 12)
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
  zoomRatio: number;
  setZoomRatio: (zoom: number) => void;
  // 🛠️ คอนเซปต์ใหม่: ปรับขนาดสนามปุ๊บ ระบบจะสร้างกรวยโซนรอบสนามให้อัตโนมัติทันที
  updateGridDimensions: (maxX: number, maxY: number) => void;

  viewMode: '2D' | '3D';
  setViewMode: (mode: '2D' | '3D') => void;

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
  movePerformer: (id: string, direction: 'front' | 'forward' | 'backward' | 'back') => void;

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
      { id: 'P01', name: 'Trumpet 1', color: '#ef4444', baseShape: 'circle', innerContentType: 'icon', innerContentValue: 'X' },
      { id: 'C01', name: 'Drum Major', color: '#3b82f6', baseShape: 'circle', innerContentType: 'icon', innerContentValue: 'O' }
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
  
  // ค่าเริ่มต้นตั้งไว้ที่ 12 * 12 ตามที่ต้องการ
  canvasConfig: {
    gridMaxX: 12,
    gridMaxY: 12,
  },

  zoomRatio: 1,
  setZoomRatio: (zoom) => set({ zoomRatio: Math.max(0.2, Math.min(4, zoom)) }),

  // 🛠️ แก้ไขลอจิกชิ้นสำคัญ: เมื่อเปลี่ยนขนาดตาราง ระบบจะคำนวณและปักกรวยโซนให้ใหม่อัตโนมัติ
  updateGridDimensions: (maxX, maxY) => set(() => {
    const validatedMaxX = Math.max(4, Math.floor(maxX));
    const validatedMaxY = Math.max(4, Math.floor(maxY));

    // คำนวณจุดปักกรวยมาตรฐานอัตโนมัติ (อิงพิกัด 0 เป็นจุดกึ่งกลาง)
    const autoCones: Cone[] = [
      // 🔽 โซนขอบสนามด้านล่าง (Y = 0)
      { id: 'auto-cone-bl', name: `L${validatedMaxX}`, x: -validatedMaxX, y: 0, color: '#ff6b1a' },
      { id: 'auto-cone-bc', name: '0 (Front)', x: 0, y: 0, color: '#0ea5e9' }, // จุดศูนย์ตรงหน้าสแตนด์
      { id: 'auto-cone-br', name: `R${validatedMaxX}`, x: validatedMaxX, y: 0, color: '#ff6b1a' },

      // 🔼 โซนขอบสนามด้านบน/แนวลึกสุด (Y = maxY)
      { id: 'auto-cone-tl', name: `L${validatedMaxX}`, x: -validatedMaxX, y: validatedMaxY, color: '#ff6b1a' },
      { id: 'auto-cone-tc', name: '0 (Back)', x: 0, y: validatedMaxY, color: '#0ea5e9' },
      { id: 'auto-cone-tr', name: `R${validatedMaxX}`, x: validatedMaxX, y: validatedMaxY, color: '#ff6b1a' }
    ];

    return {
      canvasConfig: {
        gridMaxX: validatedMaxX,
        gridMaxY: validatedMaxY
      },
      cones: autoCones // อัปเดตรายชื่อกรวยทั้งหมดในระบบให้ทันทีอัตโนมัติ
    };
  }),

  viewMode: '2D',
  setViewMode: (mode) => set({ viewMode: mode }),

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

  movePerformer: (id, direction) => set((state) => {
    const performers = [...state.data.performers];
    const index = performers.findIndex(p => p.id === id);
    if (index === -1) return state;

    const [performer] = performers.splice(index, 1);

    if (direction === 'front') {
      performers.push(performer); // highest z-index
    } else if (direction === 'back') {
      performers.unshift(performer); // lowest z-index
    } else if (direction === 'forward') {
      const newIndex = Math.min(performers.length, index + 1);
      performers.splice(newIndex, 0, performer);
    } else if (direction === 'backward') {
      const newIndex = Math.max(0, index - 1);
      performers.splice(newIndex, 0, performer);
    }

    return { data: { ...state.data, performers } };
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

  // 🛠️ ค่ากรวยเริ่มต้นปักไว้ที่ L12 และ R12 ล้อตามขนาดตารางแกน X: 12
  cones: [
    { id: 'auto-cone-bl', name: 'L12', x: -12, y: 0, color: '#ff6b1a' },
    { id: 'auto-cone-bc', name: '0 (Front)', x: 0, y: 0, color: '#0ea5e9' },
    { id: 'auto-cone-br', name: 'R12', x: 12, y: 0, color: '#ff6b1a' },
    { id: 'auto-cone-tl', name: 'L12', x: -12, y: 12, color: '#ff6b1a' },
    { id: 'auto-cone-tc', name: '0 (Back)', x: 0, y: 12, color: '#0ea5e9' },
    { id: 'auto-cone-tr', name: 'R12', x: 12, y: 12, color: '#ff6b1a' }
  ],

  addCone: (cone) => set((state) => ({ cones: [...state.cones, cone] })),
  removeCone: (id) => set((state) => ({ cones: state.cones.filter(c => c.id !== id) })),
  updateConePosition: (id, x, y) => set((state) => ({ cones: state.cones.map(c => c.id === id ? { ...c, x, y } : c) })),
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